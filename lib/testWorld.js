import { buildDecorationBlockedSet } from "./decorationCollision";
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

  { kind: "railing", gx: MiniParkOrigin.x + 12, gz: MiniParkOrigin.z + 2, rotation: Math.PI/2 },

  { kind: "streetLantern", gx: MiniParkOrigin.x + 3, gz: MiniParkOrigin.z + 1, rotation: Math.PI / 8 },
];

/**
 * Coastline cluster — brick lookout (gx 7..12, gz 19..21, level 0) overlooking
 * the sand beach to the south. Bench faces south to look at the sea.
 */
const lookoutDecorations = [
  // South-facing railing along the sea edge (gz ≈ 21.5)
  { kind: "railing", gx: 7.4, gz: 21.45, rotation: 0 },
  { kind: "railing", gx: 9.4, gz: 21.45, rotation: 0 },
  { kind: "railing", gx: 11.4, gz: 21.45, rotation: 0 },
  // Bench centered, facing south toward the sea
  { kind: "bench", gx: 10, gz: 19.5, rotation: 0 },
  { kind: "bench", gx: 11, gz: 19.5, rotation: 0 },

  // Vending machine on the east end, against the railing
  { kind: "vendingMachine", gx: 11, gz: 22, rotation: Math.PI },

  // Trash + lantern for cozy clutter
  { kind: "trashcan", gx: 11.8, gz: 22, },
  { kind: "streetLantern", gx: 7, gz: 17 },
  { kind: "streetLantern", gx: 13, gz: 17 },
];

/**
 * Road dressing — tactile paving (yellow Japan curb strip) along both
 * brick↔asphalt boundaries, and a crosswalk where the player crosses.
 */
const roadDressingDecorations = [
  // Tactile paving — north sidewalk edge (gz 13.5)
  ...Array.from({ length: 24 }, (_, gx) => ({
    kind: "tactilePaving",
    gx,
    gz: 13.7,
  })),
  // Tactile paving — south sidewalk edge (gz 16.5)
  ...Array.from({ length: 24 }, (_, gx) => ({
    kind: "tactilePaving",
    gx,
    gz: 16.3,
  })),

  // Crosswalk stripes across the road at gx 9-10 (where the player crosses)
  ...Array.from({ length: 5 }, (_, i) => ({
    kind: "crosswalkStripe",
    gx: 9.0,
    gz: 14 + i * 0.5,
  })),
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
    ...roadDressingDecorations,
    ...lookoutDecorations,
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

/** Precomputed grid cells blocked by decorations (built once at load). */
TEST_WORLD.decorationBlocked = buildDecorationBlockedSet(TEST_WORLD);
