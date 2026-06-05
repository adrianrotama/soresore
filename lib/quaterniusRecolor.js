import { BufferAttribute, Color } from "three";
import { quaterniusZoneForUV } from "@/lib/guestCatPalette";

const _color = new Color();

/**
 * Paint Quaternius cat geometry by UV zone (body / accent / eye / nose).
 * Multiplies with the atlas in MeshToonMaterial for kept markings.
 *
 * @param {import('three').BufferGeometry} geometry
 * @param {import('@/lib/guestCatPalette').GuestCatPalette} palette
 */
export function paintQuaterniusVertexColors(geometry, palette) {
  const geo = geometry.clone();
  const uv = geo.attributes.uv;
  if (!uv) return geo;

  const colors = new Float32Array(uv.count * 3);

  for (let i = 0; i < uv.count; i++) {
    const zone = quaterniusZoneForUV(uv.getX(i), uv.getY(i));
    _color.set(palette[zone] ?? palette.body);
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }

  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}
