/**
 * Shared frame-rate-independent smoothing for cameras and remote players.
 */

export const REMOTE_POSITION_SMOOTH = 8;

export function smoothRate(rate, delta) {
  return 1 - Math.exp(-rate * delta);
}

/** Lerp `current` toward `target` in place; returns `current`. */
export function lerpPosition(current, target, delta, rate = REMOTE_POSITION_SMOOTH) {
  const t = smoothRate(rate, delta);
  current.x += (target.x - current.x) * t;
  current.y += (target.y - current.y) * t;
  current.z += (target.z - current.z) * t;
  return current;
}
