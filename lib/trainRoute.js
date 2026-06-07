/**
 * Straight train route — start/end world positions, constant speed, respawn pause.
 */

import { TILE_LEVEL_HEIGHT } from "./world";

export const TRAIN_SCALE = 2;
export const TRAIN_CAR_SPACING = TRAIN_SCALE * 2.45;
/** Tail pathBack — full consist must fit on route for clean spacing. */
export const TRAIN_CONSIST_LENGTH = TRAIN_CAR_SPACING * 2;

export const DEFAULT_TRAIN_ROUTE = {
  start: [-8, TILE_LEVEL_HEIGHT, 40],
  end: [48, TILE_LEVEL_HEIGHT, 40],
  speed: 8,
  respawnMs: 10000,
};

/** Kenney train (child π/2 Y): parent +X = nose. */
export function travelHeadingToModelYaw(travelHeading) {
  return Math.PI - travelHeading;
}

export function normalizeTrainRoute(route = {}) {
  return {
    start: route.start ?? DEFAULT_TRAIN_ROUTE.start,
    end: route.end ?? DEFAULT_TRAIN_ROUTE.end,
    speed: route.speed ?? DEFAULT_TRAIN_ROUTE.speed,
    respawnMs: route.respawnMs ?? DEFAULT_TRAIN_ROUTE.respawnMs,
  };
}

export function straightRouteLength(start, end) {
  return Math.hypot(end[0] - start[0], end[2] - start[2]);
}

/**
 * @param {[number, number, number]} start
 * @param {[number, number, number]} end
 * @param {number} distance — 0 at start, increases toward end (unclamped for off-route placement)
 */
export function sampleStraightRoute(start, end, distance) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.hypot(dx, dz) || 1;
  const travelHeading = Math.atan2(dz, dx);

  return {
    position: [
      start[0] + (dx / len) * distance,
      start[1] ?? TILE_LEVEL_HEIGHT,
      start[2] + (dz / len) * distance,
    ],
    heading: travelHeadingToModelYaw(travelHeading),
  };
}

export function isCarOnRoute(carDistance, routeLength) {
  return carDistance >= 0 && carDistance <= routeLength;
}

export const TRAIN_FADE_DISTANCE = TRAIN_CAR_SPACING;

export function carRouteOpacity(
  carDistance,
  routeLength,
  fade = TRAIN_FADE_DISTANCE,
) {
  if (carDistance < 0) return Math.max(0, 1 + carDistance / fade);
  if (carDistance > routeLength) {
    return Math.max(0, 1 - (carDistance - routeLength) / fade);
  }
  return 1;
}

/** Lead distance where tail has fully faded past end (snake exit + fade). */
export function trainExitLeadDistance(routeLength) {
  return routeLength + TRAIN_CONSIST_LENGTH + TRAIN_FADE_DISTANCE;
}
