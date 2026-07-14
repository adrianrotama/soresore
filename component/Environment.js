"use client";

import { useEffect, useMemo, useRef } from "react";
import { Object3D, Vector3 } from "three";
import SkyGradient, { SKY_HORIZON } from "@/component/SkyGradient";
import Sun from "@/component/Sun";
import Clouds from "@/component/Clouds";
import CloudSea from "@/component/CloudSea";
import DioramaBase from "@/component/DioramaBase";
import { SUN_LIGHT_POSITION } from "@/lib/sunConfig";
import { WORLD_BOUNDS_MIN, WORLD_BOUNDS_MAX } from "@/lib/mapBounds";

const SUN_TARGET = new Vector3(20, 0, 31);
const SUN_POSITION = new Vector3(...SUN_LIGHT_POSITION);

/**
 * Fit an orthographic shadow frustum to `bounds`, expressed in the light's
 * own view space (forward/right/up) — not a hand-picked world-space box.
 *
 * A low, oblique "golden hour" sun means the shadow camera's right/up axes
 * are tilted relative to world X/Z. A symmetric world-aligned guess (e.g.
 * left/right = ±80) can cover one side of the map while clipping the
 * opposite side — that's why fixing "sea has no shadow" by recentering
 * broke the top area instead of fixing both. Projecting the true AABB
 * corners onto the light's actual axes is the only reliable fix.
 */
function fitShadowFrustum(lightPos, targetPos, min, max, margin = 4) {
  const forward = new Vector3().subVectors(targetPos, lightPos).normalize();
  const worldUp = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(forward, worldUp).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();

  let minR = Infinity;
  let maxR = -Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  let minF = Infinity;
  let maxF = -Infinity;
  const rel = new Vector3();

  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        rel.set(x, y, z).sub(lightPos);
        const rDot = rel.dot(right);
        const uDot = rel.dot(up);
        const fDot = rel.dot(forward);
        if (rDot < minR) minR = rDot;
        if (rDot > maxR) maxR = rDot;
        if (uDot < minU) minU = uDot;
        if (uDot > maxU) maxU = uDot;
        if (fDot < minF) minF = fDot;
        if (fDot > maxF) maxF = fDot;
      }
    }
  }

  return {
    left: minR - margin,
    right: maxR + margin,
    top: maxU + margin,
    bottom: minU - margin,
    // OrthographicCamera tolerates negative near (no perspective divide) —
    // do NOT clamp to a positive floor. The sun sits close to (partly
    // inside) the map's bounding box, so part of the map has a *negative*
    // forward distance from the light. Clamping near here silently cut
    // that geometry out of the shadow camera — that was the actual bug
    // behind "top area has no shadow".
    near: minF - margin,
    far: maxF + margin,
  };
}

const SHADOW_FRUSTUM = fitShadowFrustum(
  SUN_POSITION,
  SUN_TARGET,
  WORLD_BOUNDS_MIN,
  WORLD_BOUNDS_MAX
);

// Evening palette from AGENTS.md — orange sun, blue-gray atmosphere.
// Soft diffused golden hour: low contrast, gentle shadows, generous fill light.
const SUN_COLOR = "#fcb57f";
const FILL_COLOR = "#8aa8c8";
const AMBIENT_COLOR = "#ffd4a0";
const HEMI_SKY = "#fcb57f";
const HEMI_GROUND = "#3d6b4f";

/** Dusty warm haze matching the sky horizon — not a neutral gray/white wall. */
const FOG_COLOR = "#e3a377";
const FOG_NEAR = 22;
const FOG_FAR = 56;

export default function Environment() {
  const sunTarget = useMemo(() => {
    const target = new Object3D();
    target.position.copy(SUN_TARGET);
    target.updateMatrixWorld();
    return target;
  }, []);

  const sunLightRef = useRef(null);

  useEffect(() => {
    const light = sunLightRef.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = SHADOW_FRUSTUM.left;
    cam.right = SHADOW_FRUSTUM.right;
    cam.top = SHADOW_FRUSTUM.top;
    cam.bottom = SHADOW_FRUSTUM.bottom;
    cam.near = SHADOW_FRUSTUM.near;
    cam.far = SHADOW_FRUSTUM.far;
    cam.updateProjectionMatrix();
  }, []);

  return (
    <>
      <color attach="background" args={[SKY_HORIZON]} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      <SkyGradient />
      <Sun />
      <Clouds />
      <CloudSea />

      <ambientLight color={AMBIENT_COLOR} intensity={0.56} />

      <hemisphereLight
        skyColor={HEMI_SKY}
        groundColor={HEMI_GROUND}
        intensity={0.28}
      />

      <directionalLight
        position={[-10, 8, -6]}
        intensity={0.24}
        color={FILL_COLOR}
      />

      {/* Low-horizon golden-hour sun — shares direction with the visible disc (Sun.js). */}
      <directionalLight
        ref={sunLightRef}
        position={SUN_LIGHT_POSITION}
        target={sunTarget}
        intensity={0.62}
        color={SUN_COLOR}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />
    </>
  );
}
