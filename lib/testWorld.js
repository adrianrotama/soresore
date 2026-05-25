import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { DEFAULT_TRAIN_ROUTE } from "./trainRoute";

const MiniParkOrigin = { x: 0, z: 6 };
const MiniParkDecorations = [
  { kind: "hedgeCorner", gx: MiniParkOrigin.x, gz: MiniParkOrigin.z },
  { kind: "hedgeStraightLong", gx: MiniParkOrigin.x + 2, gz: MiniParkOrigin.z },
  { kind: "hedgeStraight", gx: MiniParkOrigin.x + 3.5, gz: MiniParkOrigin.z },
  { kind: "treeLarge", gx: MiniParkOrigin.x + 1, gz: MiniParkOrigin.z + 1 },
  { kind: "tree", gx: MiniParkOrigin.x + 1, gz: MiniParkOrigin.z + 2.5 },
  { kind: "tree", gx: MiniParkOrigin.x + 2, gz: MiniParkOrigin.z + 1 },
  { kind: "trashcan", gx: MiniParkOrigin.x + 1.5, gz: MiniParkOrigin.z + 3.5 },
  { kind: "bench", gx: MiniParkOrigin.x + 2.5, gz: MiniParkOrigin.z + 3, rotation: Math.PI / 8 },
  { kind: "bushLarge", gx: MiniParkOrigin.x + 3.8, gz: MiniParkOrigin.z + 2.1, },
  { kind: "bush", gx: MiniParkOrigin.x + 3.3, gz: MiniParkOrigin.z + 2.4, },
  { kind: "flowerA", gx: MiniParkOrigin.x + 2.3, gz: MiniParkOrigin.z + 4.5 },
  { kind: "flowerA", gx: MiniParkOrigin.x + 4.5, gz: MiniParkOrigin.z + 2.2 },
  { kind: "flowerB", gx: MiniParkOrigin.x + 2.5, gz: MiniParkOrigin.z + 4.7 },

  { kind: "streetLantern", gx: MiniParkOrigin.x + 3, gz: MiniParkOrigin.z + 1, rotation: Math.PI / 8 },
];
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
    { kind: "railCrossing", gx: 7, gz: 6.5 },
    { kind: "railCrossing", gx: 11, gz: 3, rotation: Math.PI },
    { kind: "cobbleStone", gx: 6, gz: 6 },
    { kind: "cobbleStoneLarge", gx: 5, gz: 6 },
    { kind: "grassA", gx: 6, gz: 6 },
    { kind: "grassB", gx: 5, gz: 6 },
    ...MiniParkDecorations,
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
