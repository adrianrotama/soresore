"use client";

import { Color, DoubleSide, ShaderMaterial, Vector2 } from "three";
import { SUN_LIGHT_POSITION } from "./sunConfig";
import { WORLD_CENTER } from "./mapBounds";

/**
 * Stylized toon water — cozy sunset lake/sea, not a realistic PBR shader
 * (AGENTS.md: "no realistic shaders", muted/stylized). Effects, all gentle:
 *   - slow sine surface waves (world-space so tiles align seamlessly)
 *   - shore->deep color + opacity gradient from a baked shore-distance field
 *     (shallows stay clear so the sandy seabed shows through)
 *   - scrolling stylized ripple highlight lines
 *   - a warm shimmering "sun glitter" toward the low sun
 *   - scene-matched fog so distant sea reads soft
 *
 * A sloped sandy seabed (getSeabedMaterial) sits under open-sea tiles only;
 * river water is forced opaque in the depth field (no sand). Fog constants
 * mirror Environment.js.
 */

const DEEP = new Color("#1f5866");
const SHALLOW = new Color("#6fc0c4");
const GLOW = new Color("#ffb684");
const FOAM = new Color("#eef2e8");
const SAND_SHORE = new Color("#f3dc92");
const SAND_DEEP = new Color("#6f5a3a");

const FOG_COLOR = new Color("#e3a377");
const FOG_NEAR = 22;
const FOG_FAR = 56;

/** Max downward dip of the seabed in deep water (meters below its shore level). */
const SEABED_DIP = 1.4;

const sunDirXZ = (() => {
  const [x, , z] = SUN_LIGHT_POSITION;
  const v = new Vector2(x, z);
  if (v.lengthSq() > 0) v.normalize();
  return v;
})();

const worldCenterXZ = new Vector2(WORLD_CENTER.x, WORLD_CENTER.z);

const waterVertex = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying float vViewZ;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float wave =
      sin(wp.x * 0.55 + uTime * 0.8) * 0.045
    + sin(wp.z * 0.42 - uTime * 0.65) * 0.045
    + sin((wp.x + wp.z) * 0.30 + uTime * 0.40) * 0.03;
  wp.y += wave;
  vWorldPos = wp.xyz;
  vec4 viewPos = viewMatrix * wp;
  vViewZ = -viewPos.z;
  gl_Position = projectionMatrix * viewPos;
}
`;

const waterFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlow;
uniform vec2 uSunDirXZ;
uniform vec2 uCenter;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform sampler2D uDepthMap;
uniform vec2 uMapOrigin;
uniform vec2 uMapSize;
varying vec3 vWorldPos;
varying float vViewZ;

void main() {
  // Shore->deep field (0 at shore, 1 in deep/open water).
  vec2 duv = (vWorldPos.xz - uMapOrigin) / uMapSize;
  float depth = texture2D(uDepthMap, duv).r;

  // Color follows depth, lightly stepped to keep a toon feel (no drifting blobs).
  float td = mix(depth, floor(depth * 4.0) / 4.0, 0.5);
  vec3 col = mix(uShallow, uDeep, td);

  // Scrolling stylized ripple highlight lines.
  float r =
      sin((vWorldPos.x - vWorldPos.z) * 1.1 + uTime * 1.3)
    + sin((vWorldPos.x * 0.7 + vWorldPos.z * 1.2) - uTime * 0.9) * 0.6;
  float ripple = smoothstep(0.85, 1.0, r * 0.5 + 0.5);
  col = mix(col, uShallow * 1.15, ripple * 0.25);

  // Warm shimmering "sun glitter" toward the low sun — sparse sparkles.
  vec2 sd = normalize(uSunDirXZ);
  vec2 rel = vWorldPos.xz - uCenter;
  float perp = abs(dot(rel, vec2(-sd.y, sd.x)));
  float along = dot(rel, sd);
  float path = exp(-perp * 0.2);
  float sparkle = smoothstep(0.88, 1.0, sin(along * 0.9 + uTime * 1.6) * 0.5 + 0.5);
  float glint = clamp(path * sparkle, 0.0, 1.0);
  col = mix(col, uGlow, glint * 0.35);

  // Scene-matched fog so distant sea dissolves like everything else.
  float fog = smoothstep(uFogNear, uFogFar, vViewZ);
  col = mix(col, uFogColor, fog);

  // Clear shallows (sand shows) -> opaque deep water.
  float alpha = mix(0.22, 0.95, depth);
  gl_FragColor = vec4(col, alpha);
}
`;

const foamVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const foamFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uFoam;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  // Foam concentrated on the shoreline (center of the strip across uv.y).
  float d = abs(vUv.y - 0.5) * 2.0;
  float line = 1.0 - smoothstep(0.0, 1.0, d);

  // World-space wavy break-up so adjacent foam quads flow together.
  float w = sin(vWorldPos.x * 3.0 + vWorldPos.z * 3.0 + uTime * 2.5) * 0.5 + 0.5;
  float pulse = 0.7 + 0.3 * sin(uTime * 1.5 + vWorldPos.x * 2.0);

  float a = line * (0.5 + 0.5 * w) * pulse;
  gl_FragColor = vec4(uFoam, clamp(a, 0.0, 1.0) * 0.6);
}
`;

const seabedVertex = /* glsl */ `
uniform sampler2D uDepthMap;
uniform vec2 uMapOrigin;
uniform vec2 uMapSize;
uniform float uDip;
varying float vViewZ;
varying float vDepth;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 duv = (wp.xz - uMapOrigin) / uMapSize;
  float depth = texture2D(uDepthMap, duv).r;
  vDepth = depth;
  // Seabed dips away from shore so "deeper" reads physically.
  wp.y -= depth * uDip;
  vec4 viewPos = viewMatrix * wp;
  vViewZ = -viewPos.z;
  gl_Position = projectionMatrix * viewPos;
}
`;

const seabedFragment = /* glsl */ `
uniform vec3 uSandShore;
uniform vec3 uSandDeep;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vViewZ;
varying float vDepth;

void main() {
  vec3 col = mix(uSandShore, uSandDeep, vDepth);
  float fog = smoothstep(uFogNear, uFogFar, vViewZ);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;

let waterMaterial = null;
let foamMaterial = null;
let seabedMaterial = null;
let depthField = null; // { texture, origin: [x,z], size: [w,z] }

function applyDepthField(material) {
  if (!material || !depthField) return;
  material.uniforms.uDepthMap.value = depthField.texture;
  material.uniforms.uMapOrigin.value.set(depthField.origin[0], depthField.origin[1]);
  material.uniforms.uMapSize.value.set(depthField.size[0], depthField.size[1]);
}

export function getWaterMaterial() {
  if (waterMaterial) return waterMaterial;
  waterMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: DEEP },
      uShallow: { value: SHALLOW },
      uGlow: { value: GLOW },
      uSunDirXZ: { value: sunDirXZ },
      uCenter: { value: worldCenterXZ },
      uFogColor: { value: FOG_COLOR },
      uFogNear: { value: FOG_NEAR },
      uFogFar: { value: FOG_FAR },
      uDepthMap: { value: null },
      uMapOrigin: { value: new Vector2() },
      uMapSize: { value: new Vector2(1, 1) },
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    // Coplanar water tiles overlap slightly; without this they z-fight into a
    // visible grid. Opaque geometry still occludes water (depth test stays on).
    depthWrite: false,
    side: DoubleSide,
  });
  applyDepthField(waterMaterial);
  return waterMaterial;
}

export function getFoamMaterial() {
  if (foamMaterial) return foamMaterial;
  foamMaterial = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFoam: { value: FOAM },
    },
    vertexShader: foamVertex,
    fragmentShader: foamFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  return foamMaterial;
}

export function getSeabedMaterial() {
  if (seabedMaterial) return seabedMaterial;
  seabedMaterial = new ShaderMaterial({
    uniforms: {
      uSandShore: { value: SAND_SHORE },
      uSandDeep: { value: SAND_DEEP },
      uFogColor: { value: FOG_COLOR },
      uFogNear: { value: FOG_NEAR },
      uFogFar: { value: FOG_FAR },
      uDepthMap: { value: null },
      uMapOrigin: { value: new Vector2() },
      uMapSize: { value: new Vector2(1, 1) },
      uDip: { value: SEABED_DIP },
    },
    vertexShader: seabedVertex,
    fragmentShader: seabedFragment,
    side: DoubleSide,
  });
  applyDepthField(seabedMaterial);
  return seabedMaterial;
}

/** Provide the baked shore-distance field; applied to water + seabed materials. */
export function setWaterDepthField(field) {
  depthField = field;
  applyDepthField(waterMaterial);
  applyDepthField(seabedMaterial);
}

/** Advance the animated materials' clocks (called once per frame). */
export function updateWaterTime(t) {
  if (waterMaterial) waterMaterial.uniforms.uTime.value = t;
  if (foamMaterial) foamMaterial.uniforms.uTime.value = t;
}
