"use client";

import { useMemo } from "react";
import { BackSide, Color } from "three";

/** AGENTS.md sunset palette — warm horizon, cool evening zenith. */
export const SKY_HORIZON = "#ff9d5c";
/** Soft dusk between orange and blue — stops a harsh two-band look. */
export const SKY_MID = "#9a7f8f";
export const SKY_ZENITH = "#3f5c82";
/** >1 = wider orange band above horizon; <1 = blue takes over sooner. */
export const SKY_CURVE = 0.7;

const RADIUS = 220;
const WIDTH_SEGMENTS = 32;
const HEIGHT_SEGMENTS = 16;

const vertexShader = /* glsl */ `
varying vec3 vWorldDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(worldPos.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uMid;
uniform vec3 uZenith;
uniform float uCurve;
varying vec3 vWorldDir;

void main() {
  // 0 = horizon, 1 = straight up. Clamp — never discard (discard exposed blue
  // canvas below the orange band and looked like two separate layers).
  float elevation = max(vWorldDir.y, 0.0);
  float t = pow(smoothstep(0.0, 1.0, elevation), uCurve);

  vec3 dusk = mix(uHorizon, uMid, smoothstep(0.0, 0.78, t));
  vec3 color = mix(dusk, uZenith, smoothstep(0.42, 1.0, t));
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Inverted gradient dome — no GLB. Sits behind the world; ignores scene fog.
 */
export default function SkyGradient() {
  const uniforms = useMemo(
    () => ({
      uHorizon: { value: new Color(SKY_HORIZON) },
      uMid: { value: new Color(SKY_MID) },
      uZenith: { value: new Color(SKY_ZENITH) },
      uCurve: { value: SKY_CURVE },
    }),
    []
  );

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <sphereGeometry
        args={[RADIUS, WIDTH_SEGMENTS, HEIGHT_SEGMENTS]}
      />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
