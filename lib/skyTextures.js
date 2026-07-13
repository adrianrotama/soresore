"use client";

/**
 * Procedural canvas textures for the sky — no external image assets.
 * Lazily created and cached; only call from client components (uses `document`).
 */
import { CanvasTexture } from "three";

let cloudTexture = null;
let sunGlowTexture = null;

function makeRadialTexture(size, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size / 2);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Soft round white blob — tinted per-instance via material color. */
export function getCloudTexture() {
  if (cloudTexture) return cloudTexture;
  cloudTexture = makeRadialTexture(128, (ctx, r) => {
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, r * 2, r * 2);
  });
  return cloudTexture;
}

/** Warm radial falloff for the sun halo. */
export function getSunGlowTexture() {
  if (sunGlowTexture) return sunGlowTexture;
  sunGlowTexture = makeRadialTexture(256, (ctx, r) => {
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.22, "rgba(255,224,180,0.75)");
    grad.addColorStop(0.55, "rgba(255,180,120,0.28)");
    grad.addColorStop(1, "rgba(255,180,120,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, r * 2, r * 2);
  });
  return sunGlowTexture;
}
