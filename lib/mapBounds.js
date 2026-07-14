import { Vector3 } from "three";

/**
 * Shared world map footprint (lib/testTileMap.js: 30 cols x 51 rows, origin
 * [-10,0,-20]) padded on Y for the tallest tiles/decorations (elevated G5
 * grass ~5m, konbini, lanterns, trees). Recompute if the map footprint or
 * tallest prop changes.
 *
 * Consumed by the sun shadow frustum fit (Environment.js) and the floating
 * diorama underside (DioramaBase.js), so both stay sized to the same box.
 */
export const WORLD_BOUNDS_MIN = new Vector3(-9, -4, -19);
export const WORLD_BOUNDS_MAX = new Vector3(49, 10, 81);

export const WORLD_CENTER = new Vector3()
  .addVectors(WORLD_BOUNDS_MIN, WORLD_BOUNDS_MAX)
  .multiplyScalar(0.5);

export const WORLD_SIZE = new Vector3().subVectors(
  WORLD_BOUNDS_MAX,
  WORLD_BOUNDS_MIN
);
