import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";

/**
 * Combined world data — terrain grid + decorations + landmarks.
 *
 * decorations: grid-anchored small props ({ kind, gx, gz, rotation? }).
 * landmarks:   world-anchored large structures ({ kind, ...kindProps }).
 *
 * Decorations follow cell elevation automatically via surfaceYAt(); landmarks
 * own their world position (and may need positionRef for proximity logic).
 */
export const TEST_WORLD = {
  map: TEST_TILE_MAP,
  origin: TEST_TILE_MAP_ORIGIN,
  decorations: [
    { kind: "marker", gx: 11, gz: 0 },
    { kind: "marker", gx: 0, gz: 11 },
  ],
  landmarks: [
    { kind: "depot" },
  ],
};
