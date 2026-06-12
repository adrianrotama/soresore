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
const W = "water";

const G2 = { type: G, level: 1 };

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
const stairUpN = (level = 0) => ({ type: "stair", level, rotation: Math.PI });

const STAIR_L1 = stairUpW(0);
const STAIR_R1 = stairUpE(0);
const STAIR_L2 = stairUpW(-1);
const STAIR_R2 = stairUpE(-1);
const STAIR_N1 = stairUpN(1);

const S = { type: "sand", level: -1 };
const S2 = { type: "sand", level: -2 };

/** Open sea south of the beach — same level as S2 sand. */
const SEA = { type: W, level: -2 };
const SEA_ROW = Array.from({ length: 30 }, () => SEA);

/**
 * River under a bridge — water mesh, walkable. `surfaceYOffset` lifts player
 * walk Y only (bridge decoration anchor ignores this — see walkSurfaceYAt).
 */
export const BRIDGE_WALK_SURFACE_LIFT = 0.22;
const BW = { type: W, walkable: true, surfaceYOffset: BRIDGE_WALK_SURFACE_LIFT };
const BP = { type: P, walkable: true, surfaceYOffset: BRIDGE_WALK_SURFACE_LIFT };

export const TEST_TILE_MAP = [
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2, G2],
  [G, G, G, G, STAIR_N1, STAIR_N1, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, BP, BW, BW, BP, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, BP, BW, BW, BP, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, P, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, W, P, G, G, G, G, G, G, G, G, G, G, G],

  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, P, P, P, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, P, P, P, G, G, G, G, P, W, W, P, G, G, G, G, G, G, G, G, G, G, G],
  
  [D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D],
  [D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D],
  
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],

  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A],
  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A],
  [A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A, A],

  
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, STAIR_L2, S, STAIR_L1, B, B, B, B, B, B, STAIR_R1, S, STAIR_R2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],

  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],
  [S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2, S2,],

  SEA_ROW,
  SEA_ROW,
  SEA_ROW,
  SEA_ROW,
];

/** World Start at 0,0,0 */
export const TEST_TILE_MAP_ORIGIN = [-10, 0, -20];
