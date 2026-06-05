"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { consumeStepTicks } from "@/lib/gameAudio";
import {
  canMoveTo,
  getCell,
  stairProgress01,
  surfaceYAt,
  TILE_LEVEL_HEIGHT,
  worldToGrid,
} from "@/lib/world";
import { TILE_SIZE } from "@/lib/tileGrid";
import PlayerAvatar from "@/component/PlayerAvatar";
import { DEFAULT_PLAYER_CAT } from "@/lib/playerModels";

const MAX_SPEED = 10;
// How fast velocity catches the input direction (lower = softer start).
const ACCELERATION = 10;
// How fast velocity bleeds off when keys release (lower = longer coast).
const DECELERATION = 4.5;
const STOP_THRESHOLD = 0.02;
// Turn toward facing target (lower = softer curves).
const ROTATION_SMOOTH = 10;
// Hard cap on yaw speed — keeps W↔S / A↔D from whipping (~π rad in ~1s).
const MAX_TURN_SPEED = 4;
const ROTATION_MIN_SPEED = 0.12;
// Below this dot(velocity, input), treat as a reversal — face intent, not momentum.
const REVERSE_FACING_DOT = 0.25;

const PLAYER_FOOT_OFFSET = 0.5;
const GROUND_SNAP_RATE = 18;
const STAIR_TILT_RATE = 14;
const STAIR_TILT_ANGLE = Math.atan2(TILE_LEVEL_HEIGHT, TILE_SIZE);

function isMovingKey(key) {
  return (
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d" ||
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}

/** Camera-space stick input: x = strafe, z = forward/back (W → z = -1). */
function getCameraSpaceInput(keys) {
  let x = 0;
  let z = 0;

  if (keys.w || keys.ArrowUp) z -= 1;
  if (keys.s || keys.ArrowDown) z += 1;
  if (keys.a || keys.ArrowLeft) x -= 1;
  if (keys.d || keys.ArrowRight) x += 1;

  const length = Math.hypot(x, z);
  if (length === 0) return null;

  return { x: x / length, z: z / length };
}

/**
 * Horizontal basis from the follow camera.
 * Forward = where the camera looks on the ground (camera → player).
 * Right = perpendicular on XZ (forward × up), matching Three.js camera right.
 */
function getCameraBasis(camera, playerX, playerZ, lastForward) {
  const dx = playerX - camera.position.x;
  const dz = playerZ - camera.position.z;
  const len = Math.hypot(dx, dz);

  if (len < 0.001) {
    return {
      forward: lastForward,
      right: { x: -lastForward.z, z: lastForward.x },
    };
  }

  const forward = { x: dx / len, z: dz / len };
  const right = { x: -forward.z, z: forward.x };
  return { forward, right };
}

/** Map camera-space input to a normalized world XZ direction. */
function cameraInputToWorld(input, forward, right) {
  // W (input.z = -1) → +forward; A (input.x = -1) → -right
  const wx = right.x * input.x + forward.x * -input.z;
  const wz = right.z * input.x + forward.z * -input.z;
  const len = Math.hypot(wx, wz);
  return len > 0 ? { x: wx / len, z: wz / len } : null;
}

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** Yaw for a mesh whose default forward is Three.js -Z. */
function yawFromDirection(dirX, dirZ) {
  return Math.atan2(-dirX, -dirZ);
}

/** Frame-rate-independent lerp factor (same curve as FollowCamera). */
function smoothRate(rate, delta) {
  return 1 - Math.exp(-rate * delta);
}

/**
 * Cozy-facing: follow velocity when aligned with input; on sharp reversals,
 * turn toward where the player wants to go (input) instead of slide direction.
 */
function getFacingDirection(vel, speed, worldInput) {
  if (speed >= ROTATION_MIN_SPEED) {
    const vx = vel.x / speed;
    const vz = vel.z / speed;
    if (worldInput) {
      const dot = vx * worldInput.x + vz * worldInput.z;
      if (dot < REVERSE_FACING_DOT) {
        return { x: worldInput.x, z: worldInput.z };
      }
    }
    return { x: vx, z: vz };
  }
  if (worldInput) return { x: worldInput.x, z: worldInput.z };
  return null;
}

export default function LocalPlayer({
  positionRef,
  world,
  catModel = DEFAULT_PLAYER_CAT,
  guestPalette,
}) {
  const { camera } = useThree();
  const meshRef = useRef();
  const moving01Ref = useRef(0);
  const keys = useRef({});
  const velocityRef = useRef({ x: 0, z: 0 });
  const lastForwardRef = useRef({ x: 0, z: -1 });
  const timeRef = useRef(0);
  const movePhaseRef = useRef(0);
  const moveIntensityRef = useRef(0);
  const lastStepIndexRef = useRef(0);

  // Cozy "physical lies" — tiny values only.
  const IDLE_BOB_AMP = 0.03;
  const IDLE_BOB_HZ = 0.9;
  const MOVE_BOB_AMP = 0.05;
  // Keep movement bob frequency constant to avoid start/stop jitter.
  const MOVE_BOB_HZ = 1.8;
  const SQUASH_AMP = 0.035;

  useEffect(() => {
    const down = (e) => {
      if (isMovingKey(e.key)) keys.current[e.key] = true;
    };
    const up = (e) => {
      if (isMovingKey(e.key)) keys.current[e.key] = false;
    };
    const clearKeys = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearKeys);
    const onVisibilityChange = () => {
      if (document.hidden) clearKeys();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;

    const pos = positionRef.current;
    const vel = velocityRef.current;
    let stairCell = null;
    let stairRot = 0;
    let stairProgress = 0;

    const cameraInput = getCameraSpaceInput(keys.current);
    const { forward, right } = getCameraBasis(
      camera,
      pos.x,
      pos.z,
      lastForwardRef.current
    );
    lastForwardRef.current = forward;

    const worldInput =
      cameraInput && cameraInputToWorld(cameraInput, forward, right);

    // Velocity steers toward a target — separate rates for press vs release.
    // Accel: ease toward (input direction × max speed). Decel: ease toward zero.
    // Decel < accel → cozy glide after letting go; decel > accel → snappy stop.
    if (worldInput) {
      const targetVx = worldInput.x * MAX_SPEED;
      const targetVz = worldInput.z * MAX_SPEED;
      const t = smoothRate(ACCELERATION, delta);
      vel.x += (targetVx - vel.x) * t;
      vel.z += (targetVz - vel.z) * t;
    } else {
      const t = smoothRate(DECELERATION, delta);
      vel.x += (0 - vel.x) * t;
      vel.z += (0 - vel.z) * t;

      if (Math.hypot(vel.x, vel.z) < STOP_THRESHOLD) {
        vel.x = 0;
        vel.z = 0;
      }
    }

    const nextX = pos.x + vel.x * delta;
    const nextZ = pos.z + vel.z * delta;

    if (world?.map && world?.origin) {
      const { gx: fromGx, gz: fromGz } = worldToGrid(world, pos.x, pos.z);
      const full = worldToGrid(world, nextX, nextZ);

      if (canMoveTo(world, fromGx, fromGz, full.gx, full.gz)) {
        pos.x = nextX;
        pos.z = nextZ;
      } else {
        const xOnly = worldToGrid(world, nextX, pos.z);
        if (canMoveTo(world, fromGx, fromGz, xOnly.gx, xOnly.gz)) {
          pos.x = nextX;
        }
        const afterX = worldToGrid(world, pos.x, pos.z);
        const zOnly = worldToGrid(world, pos.x, nextZ);
        if (canMoveTo(world, afterX.gx, afterX.gz, zOnly.gx, zOnly.gz)) {
          pos.z = nextZ;
        }
      }
    } else {
      pos.x = nextX;
      pos.z = nextZ;
    }

    // Phase 4: Ground-snap (smoothed). Converts world XZ -> grid coords and
    // lerps Y toward surfaceYAt + foot offset. For stairs, surfaceYAt returns
    // the upper landing (good enough for now; slope interpolation is later).
    if (world?.map && world?.origin) {
      const { gx, gz } = worldToGrid(world, pos.x, pos.z);
      const cell = getCell(world, gx, gz);
      stairCell = cell?.type === "stair" ? cell : null;
      stairRot = stairCell?.rotation ?? 0;
      stairProgress = stairCell ? stairProgress01(stairCell, gx, gz) : 0;
      const surfaceY =
        cell?.type === "stair"
          ? // Stair `level` is the BASE; tile rises from level*H (low end)
            // up to (level+1)*H (high end). E.g. STAIR_L1 (level 0) → 0..1 m.
            (cell.level + stairProgress) * TILE_LEVEL_HEIGHT
          : surfaceYAt(world, gx, gz);
      const targetY = surfaceY + PLAYER_FOOT_OFFSET;
      pos.y += (targetY - pos.y) * smoothRate(GROUND_SNAP_RATE, delta);
    }

    const mesh = meshRef.current;
    if (!mesh) return;

    // Lean along the player's LOCAL forward axis (pitch), not world axes —
    // so it always reads as "forward/back lean" no matter where they face.
    // Euler order YXZ means rotation.x is applied AFTER yaw → local pitch.
    if (mesh.rotation.order !== "YXZ") mesh.rotation.order = "YXZ";

    let targetPitch = 0;
    if (stairCell) {
      // Slope-up direction in world XZ (stair at rot=0 climbs toward +Z).
      const upX = Math.sin(stairRot);
      const upZ = Math.cos(stairRot);
      // Player facing from current yaw (mesh default forward = -Z).
      const yaw = mesh.rotation.y;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      // dot > 0 → facing uphill (lean forward); dot < 0 → downhill (lean back).
      const dot = fwdX * upX + fwdZ * upZ;
      targetPitch = STAIR_TILT_ANGLE * dot;
    }
    mesh.rotation.x +=
      (targetPitch - mesh.rotation.x) * smoothRate(STAIR_TILT_RATE, delta);
    if (mesh.rotation.z !== 0) {
      mesh.rotation.z +=
        (0 - mesh.rotation.z) * smoothRate(STAIR_TILT_RATE, delta);
    }

    const speed = Math.hypot(vel.x, vel.z);

    // Subtle bob + squash for grounding (visual only; does not affect networking).
    // Smooth the movement intensity so visuals ramp in/out without micro-jitter.
    const targetIntensity = Math.min(1, speed / MAX_SPEED);
    moveIntensityRef.current +=
      (targetIntensity - moveIntensityRef.current) * smoothRate(12, delta);
    const moving01 = moveIntensityRef.current;
    moving01Ref.current = moving01;

    // Phase is continuous (no per-frame frequency changes).
    movePhaseRef.current += Math.PI * 2 * MOVE_BOB_HZ * delta;
    consumeStepTicks(movePhaseRef.current, lastStepIndexRef, moving01);

    const idleBob = Math.sin(timeRef.current * Math.PI * 2 * IDLE_BOB_HZ) * IDLE_BOB_AMP;
    const moveBob = Math.sin(movePhaseRef.current) * MOVE_BOB_AMP * moving01;
    const bobY = idleBob + moveBob;

    // Squash when "step" hits (use cos so it's strongest at bob troughs).
    const squash =
      (1 - Math.cos(movePhaseRef.current)) * 0.5 * SQUASH_AMP * moving01;
    mesh.scale.set(1 + squash * 0.25, 1 - squash, 1 + squash * 0.25);

    mesh.position.set(pos.x, pos.y + bobY, pos.z);

    const facing = getFacingDirection(vel, speed, worldInput);

    if (facing) {
      const targetYaw = yawFromDirection(facing.x, facing.z);
      const deltaYaw = wrapAngle(targetYaw - mesh.rotation.y);
      let step = deltaYaw * smoothRate(ROTATION_SMOOTH, delta);
      const maxStep = MAX_TURN_SPEED * delta;
      if (Math.abs(step) > maxStep) {
        step = Math.sign(step) * maxStep;
      }
      mesh.rotation.y += step;
    }
  });

  const { x, y, z } = positionRef.current;

  return (
    <group ref={meshRef} position={[x, y, z]}>
      <PlayerAvatar
        modelKey={catModel}
        moving01Ref={moving01Ref}
        guestPalette={guestPalette}
      />
    </group>
  );
}
