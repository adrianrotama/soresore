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
const C = "concrete";

const P1 = { type: P, level: 1 };

export const TEST_TILE_MAP = [
  // Line 1
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 2
  [G, G, G, G, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 3
  [G, G, G, G, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 4
  [G, G, G, G, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 5 (Train Lines)
  [D, D, D, D, D, D, D, D, A, A, A, D, D, D, D, D, D, D, D, D, D, D, D, D,],
  // Line 6 (Train Lines)
  [D, D, D, D, D, D, D, D, A, A, A, D, D, D, D, D, D, D, D, D, D, D, D, D,],
  // Line 7 — raised path at gx 3 (Phase 2 elevation check; remove when coastline lookout ships)
  [G, G, G, P1, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 8
  [G, G, G, G, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 9
  [G, G, G, G, G, G, G, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 10 (Player)
  [G, G, G, P, P, P, P, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 11
  [G, G, G, P, P, P, P, P, A, A, A, P, G, G, G, G, G, G, G, G, G, G, G, G,],
  // Line 12
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, A, A, A, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G,],
];

/** World Start at 0,0,0 */
export const TEST_TILE_MAP_ORIGIN = [-10, 0, -20];
