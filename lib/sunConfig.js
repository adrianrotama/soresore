/**
 * Shared low-horizon sun direction — keeps the directional light (Environment.js)
 * and the visible sun disc (Sun.js) pointing the same way.
 */
export const SUN_LIGHT_POSITION = [10, 6, 25];
export const SUN_VISUAL_DISTANCE = 160;

export function sunVisualPosition() {
  const [x, y, z] = SUN_LIGHT_POSITION;
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const scale = SUN_VISUAL_DISTANCE / len;
  return [x * scale, y * scale, z * scale];
}
