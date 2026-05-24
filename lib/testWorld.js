import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { DEFAULT_TRAIN_ROUTE } from "./trainRoute";

export const TEST_WORLD = {
  map: TEST_TILE_MAP,
  origin: TEST_TILE_MAP_ORIGIN,
  decorations: [
    // Train runs +X at z ≈ -10; pieces along gx, step 4 cells (8 m)
    { kind: "railroadStraight", gx: 0, gz: 4.5 },
    { kind: "railroadStraight", gx: 4, gz: 4.5 },
    { kind: "railroadStraight", gx: 8, gz: 4.5 },
    { kind: "railroadStraight", gx: 12, gz: 4.5 },
    { kind: "railroadStraight", gx: 16, gz: 4.5 },
    { kind: "railroadStraight", gx: 20, gz: 4.5 },
    { kind: "trashcan", gx: 1.5, gz: 9 },
    { kind: "bench", gx: 2.5, gz: 8, rotation: Math.PI / 8 },
    { kind: "treeLarge", gx: 1, gz: 6 },
    { kind: "tree", gx: 1, gz: 7.5 },
    { kind: "tree", gx: 2, gz: 6 },
    { kind: "streetLantern", gx: 3.5, gz: 7, rotation: Math.PI / 8 },
    { kind: "railCrossing", gx: 7, gz: 6.5 },
    { kind: "railCrossing", gx: 11, gz: 3, rotation: Math.PI },
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
