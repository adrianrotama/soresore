/**
 * Test tile map — grass field for the test world.
 *
 * Adjust origin / map when retuning loop placement vs the 2 m tile grid.
 *
 * Grid axes: rows along +Z (gz), columns along +X (gx).
 */

const G = "grass";
const D = "dirt";
const A = "asphalt";
const P = "path";
const B = "brick";

const P1 = { type: P, level: 1 };

/**
 * Stair helpers. `level` is the BOTTOM step — the stair climbs from
 * `level` up to `level + 1`. Stack two stairs at consecutive levels for
 * a two-step descent (e.g. brick 0 → mid -1 → sand -2).
 *
 * Rotation: which world direction the climb faces.
 *   stairUpW (rotation: π/2)  — landing on west side, low step on east
 *   stairUpE (rotation: -π/2) — landing on east side, low step on west
 */
const stairUpW = (level = 0) => ({ type: "stair", level, rotation: Math.PI / 2 });
const stairUpE = (level = 0) => ({ type: "stair", level, rotation: -Math.PI / 2 });

const STAIR_L1 = stairUpW(0);
const STAIR_R1 = stairUpE(0);
const STAIR_L2 = stairUpW(-1);
const STAIR_R2 = stairUpE(-1);

const S = { type: "sand", level: -1 };
const S2 = { type: "sand", level: -2 };

export const TEST_TILE_MAP = [
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],

  [G, G, G, G, G, G, P, P, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, P, P, P, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, P, P, P, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, P, P, P, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  
  [D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D,],
  [D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D,],
  
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B,],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B,],

  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A,],
  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A,],
  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A,],

  
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B,],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B,],
  
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2,],

  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  
];

/** World Start at 0,0,0 */
export const TEST_TILE_MAP_ORIGIN = [-10, 0, -20];
