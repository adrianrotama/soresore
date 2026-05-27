import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { DEFAULT_TRAIN_ROUTE } from "./trainRoute";

const MiniParkOrigin = { x: 1, z: 3 };
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

const railRoadOrigin = { x: 0, z: DEFAULT_TRAIN_ROUTE.start[2] + 8.5 };
const railRoadDecorations = [
  { kind: "railroadStraight", gx: railRoadOrigin.x, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 4, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 8, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 12, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 16, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 20, gz: railRoadOrigin.z },
  { kind: "railCrossing", gx: railRoadOrigin.x + 7, gz: railRoadOrigin.z + 2 },
  { kind: "railCrossing", gx: railRoadOrigin.x + 11, gz: railRoadOrigin.z - 2, rotation: Math.PI },
  { kind: "cobbleStone", gx: railRoadOrigin.x + 6, gz: railRoadOrigin.z + 1.5 },
  { kind: "cobbleStoneLarge", gx: railRoadOrigin.x + 5, gz: railRoadOrigin.z + 1.5 },
  { kind: "grassA", gx: railRoadOrigin.x + 6, gz: railRoadOrigin.z + 1.5 },
  { kind: "grassB", gx: railRoadOrigin.x + 5, gz: railRoadOrigin.z + 1.5 },
]

export const TEST_WORLD = {
  map: TEST_TILE_MAP,
  origin: TEST_TILE_MAP_ORIGIN,
  decorations: [
    ...railRoadDecorations,
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
