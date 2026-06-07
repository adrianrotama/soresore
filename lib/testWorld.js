import { buildWorldBlockedSet } from "./decorationCollision";
import { worldZToGridGz } from "./tileGrid";
import { TEST_TILE_MAP, TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { DEFAULT_TRAIN_ROUTE } from "./trainRoute";
import { cellSurfaceWorld } from "./world";

/** Japanese Store — grid snap Y from `surfaceYAt` (respects cell.level). */
const KONBINI_GX = 20;
const KONBINI_GZ = 13;
const WORLD_SNAP = { map: TEST_TILE_MAP, origin: TEST_TILE_MAP_ORIGIN };
const [KONBINI_X, KONBINI_Y, KONBINI_Z] = cellSurfaceWorld(
  WORLD_SNAP,
  KONBINI_GX,
  KONBINI_GZ,
);

const MiniParkOrigin = { x: 0, z: 16 };
const MiniParkDecorations = [
  { kind: "hedgeCorner", gx: MiniParkOrigin.x, gz: MiniParkOrigin.z },
  { kind: "hedgeStraightLong", gx: MiniParkOrigin.x + 2, gz: MiniParkOrigin.z },
  { kind: "hedgeStraight", gx: MiniParkOrigin.x + 3.5, gz: MiniParkOrigin.z },
  { kind: "hedgeCorner", gx: MiniParkOrigin.x, gz: MiniParkOrigin.z + 6, rotation: Math.PI / 2 },
  { kind: "hedgeStraightLong", gx: MiniParkOrigin.x + 0, gz: MiniParkOrigin.z + 2, rotation: Math.PI / 2 },
  { kind: "hedgeStraightLong", gx: MiniParkOrigin.x + 0, gz: MiniParkOrigin.z + 4, rotation: Math.PI / 2 },
  { kind: "hedgeStraightLong", gx: MiniParkOrigin.x + 2, gz: MiniParkOrigin.z + 6},
  { kind: "trashcan", gx: MiniParkOrigin.x + 1, gz: MiniParkOrigin.z + 1 },
  { kind: "bench", gx: MiniParkOrigin.x + 2, gz: MiniParkOrigin.z + 1 },
  { kind: "bush", gx: MiniParkOrigin.x + 3.6, gz: MiniParkOrigin.z + 5.3 },
  { kind: "bushLarge", gx: MiniParkOrigin.x + 4, gz: MiniParkOrigin.z + 5,  },
  { kind: "grassB", gx: MiniParkOrigin.x + 4.4, gz: MiniParkOrigin.z + 5.3, rotation: -Math.PI / 2 },
  { kind: "flowerA", gx: MiniParkOrigin.x + 2.8, gz: MiniParkOrigin.z + 4 },
  { kind: "flowerB", gx: MiniParkOrigin.x + 3, gz: MiniParkOrigin.z + 4.2},
  { kind: "flowerA", gx: MiniParkOrigin.x + 5, gz: MiniParkOrigin.z + 2.2 },
  { kind: "cobbleStone", gx: MiniParkOrigin.x + 4.6, gz: MiniParkOrigin.z + 4.2  },
  { kind: "cobbleStone", gx: MiniParkOrigin.x + 5.7, gz: MiniParkOrigin.z + 5.3 },
  { kind: "cobbleStoneLarge", gx: MiniParkOrigin.x + 5, gz: MiniParkOrigin.z + 5 },

  { kind: "streetLantern", gx: MiniParkOrigin.x + 3, gz: MiniParkOrigin.z + 1, rotation: Math.PI / 8 },
];

const riverBankOrigin = { x: 9, z: 13 };
const riverBankDecorations = [
  { kind: "bench", gx: riverBankOrigin.x + 3, gz: riverBankOrigin.z + 0, rotation: Math.PI / 2 },
  { kind: "bench", gx: riverBankOrigin.x + 3, gz: riverBankOrigin.z + 2, rotation: Math.PI / 2 },
  { kind: "bush", gx: riverBankOrigin.x + 3.2, gz: riverBankOrigin.z + 1 },
  { kind: "grassA", gx: riverBankOrigin.x + 6, gz: riverBankOrigin.z + 12, rotation: -Math.PI / 2 },
  { kind: "streetLantern", gx: riverBankOrigin.x + 5, gz: riverBankOrigin.z + 5 },
  { kind: "railing", gx: riverBankOrigin.x + 5.3, gz: riverBankOrigin.z + 0, rotation: Math.PI / 2 },
  { kind: "railing", gx: riverBankOrigin.x + 5.3, gz: riverBankOrigin.z + 2, rotation: Math.PI / 2 },
  { kind: "railing", gx: riverBankOrigin.x + 7.8, gz: riverBankOrigin.z + 0, rotation: Math.PI / 2 },
  { kind: "railing", gx: riverBankOrigin.x + 7.8, gz: riverBankOrigin.z + 2, rotation: Math.PI / 2 },
];

const railRoadOrigin = {
  x: 0,
  z: worldZToGridGz(DEFAULT_TRAIN_ROUTE.start[2], TEST_TILE_MAP_ORIGIN[2]),
};
const railRoadDecorations = [
  { kind: "railroadStraight", gx: railRoadOrigin.x, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 4, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 8, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 12, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 16, gz: railRoadOrigin.z },
  { kind: "railroadStraight", gx: railRoadOrigin.x + 20, gz: railRoadOrigin.z },
  { kind: "railCrossing", gx: railRoadOrigin.x + 7, gz: railRoadOrigin.z + 2 },
  { kind: "railCrossing", gx: railRoadOrigin.x + 11, gz: railRoadOrigin.z - 2, rotation: Math.PI },
]

/**
 * Road dressing — tactile paving (yellow Japan curb strip) along both
 * brick↔asphalt boundaries, and a crosswalk where the player crosses.
 */
const roadDressingDecorations = [
  // Tactile paving — north sidewalk edge (gz 13.5)
  ...Array.from({ length: 30 }, (_, gx) => ({
    kind: "tactilePaving",
    gx,
    gz: railRoadOrigin.z + 3.2,
  })),
  // Tactile paving — south sidewalk edge (gz 16.5)
  ...Array.from({ length: 30 }, (_, gx) => ({
    kind: "tactilePaving",
    gx,
    gz: railRoadOrigin.z + 5.8,
  })),

  // Crosswalk stripes across the road at gx 9-10 (where the player crosses)
  ...Array.from({ length: 5 }, (_, i) => ({
    kind: "crosswalkStripe",
    gx: 9.0,
    gz: railRoadOrigin.z + 3.5 + i * 0.5,
  })),
];


const lookoutOrigin = { x: 0, z: railRoadOrigin.z + 10.9 };
const lookoutDecorations = [
  { kind: "railing", gx: 7.4, gz: lookoutOrigin.z, rotation: 0 },
  { kind: "railing", gx: 9.4, gz: lookoutOrigin.z, rotation: 0 },
  { kind: "railing", gx: 11.4, gz: lookoutOrigin.z, rotation: 0 },
  { kind: "bench", gx: 10, gz: lookoutOrigin.z - 1.5, rotation: 0 },
  { kind: "bench", gx: 11, gz: lookoutOrigin.z - 1.5, rotation: 0 },

  { kind: "vendingMachine", gx: 11, gz: lookoutOrigin.z + 0.8, rotation: Math.PI },
  { kind: "trashcan", gx: 11.8, gz: lookoutOrigin.z + 0.8, },
  { kind: "streetLantern", gx: 6, gz: lookoutOrigin.z - 3.5 },
  { kind: "streetLantern", gx: 14, gz: lookoutOrigin.z - 3.5 },
];

export const TEST_WORLD = {
  map: TEST_TILE_MAP,
  origin: TEST_TILE_MAP_ORIGIN,
  decorations: [
    { kind: "treeLarge", gx: 0, gz: 0 },
    { kind: "tree", gx: 1, gz: 0 },
    { kind: "treeLarge", gx: 2, gz: 0 },
    { kind: "tree", gx: 0, gz: 1 },
    { kind: "treeLarge", gx: 0, gz: 2 },

    { kind: "treeLarge", gx: 19, gz: 0.3 },
    { kind: "treeLarge", gx: 20, gz: 0 },
    { kind: "treeLarge", gx: 21, gz: 0.2 },
    { kind: "tree", gx: 22, gz: 0 },
    { kind: "treeLarge", gx: 23, gz: 0 },
    { kind: "tree", gx: 23, gz: 1 },
    { kind: "treeLarge", gx: 23, gz: 2 },
    ...railRoadDecorations,
    ...riverBankDecorations,
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
    {
      kind: "konbini",
      position: [KONBINI_X, KONBINI_Y, KONBINI_Z],
      rotation: -Math.PI / 2,
      collision: {
        blocks: true,
        cellsX: 2,
        cellsZ: 2,
      },
      sign: {
        text: "Sore-Sore",
        position: [2.52, 3.9, 0],
        fontSize: 0.3,
        color: "#3d2b1f",
        depth: 0.06,
        yaw: Math.PI / 2,
        tilt: 0.34,
        roll: 0,
      },
    },
  ],
};

/** Precomputed grid cells blocked by decorations (built once at load). */
TEST_WORLD.decorationBlocked = buildWorldBlockedSet(TEST_WORLD);
