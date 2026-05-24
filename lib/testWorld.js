import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { DEFAULT_TRAIN_ROUTE } from "./trainRoute";

/**
 * Combined world data — terrain grid + decorations + landmarks.
 */
export const TEST_WORLD = {
  map: TEST_TILE_MAP,
  origin: TEST_TILE_MAP_ORIGIN,
  decorations: [
    { kind: "marker", gx: 11, gz: 0 },
    { kind: "marker", gx: 0, gz: 11 },
    { kind: "trashcan", gx: 1, gz: 9 },
    { kind: "bench", gx: 2, gz: 9 },
    { kind: "tree", gx: 1, gz: 7 },
    { kind: "treeLarge", gx: 5, gz: 9 },
    { kind: "streetLantern", gx: 6, gz: 9 },
  ],
  landmarks: [
    {
      kind: "train",
      start: DEFAULT_TRAIN_ROUTE.start,
      end: DEFAULT_TRAIN_ROUTE.end,
      speed: DEFAULT_TRAIN_ROUTE.speed,
      respawnMs: DEFAULT_TRAIN_ROUTE.respawnMs,
    },
  ],
};
