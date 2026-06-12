import { CanvasTexture, SRGBColorSpace } from "three";

function drawFace(ctx, variant) {
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = "#3d2b1f";
  ctx.beginPath();
  ctx.ellipse(88, 102, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(168, 102, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(91, 98, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(171, 98, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c9927a";
  ctx.beginPath();
  ctx.ellipse(128, 132, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3d2b1f";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (variant === "smile") {
    ctx.arc(128, 158, 26, 0.15 * Math.PI, 0.85 * Math.PI);
  } else {
    ctx.moveTo(110, 162);
    ctx.quadraticCurveTo(128, 170, 146, 162);
  }
  ctx.stroke();
}

/**
 * Procedural face — avoids SVG sizing / loader quirks in WebGL.
 */
export function createFaceCanvasTexture(variant = "normal") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  drawFace(ctx, variant);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
