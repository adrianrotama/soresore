"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const MAX_SPEED = 4;
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

export default function LocalPlayer({ positionRef }) {
  const { camera } = useThree();
  const meshRef = useRef();
  const keys = useRef({});
  const velocityRef = useRef({ x: 0, z: 0 });
  const lastForwardRef = useRef({ x: 0, z: -1 });

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
    const pos = positionRef.current;
    const vel = velocityRef.current;

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

    pos.x += vel.x * delta;
    pos.z += vel.z * delta;

    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.position.set(pos.x, pos.y, pos.z);

    const speed = Math.hypot(vel.x, vel.z);
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
    <mesh ref={meshRef} position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}
