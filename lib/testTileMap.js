/**
 * Test tile map covering the depot area (train + hut + spawn).
 *
 * Origin chosen so the train sits over the dirt band and the hut sits on the
 * stone platform. Adjust origin / map to retune sizing relative to the
 * Kenney train (TRAIN_SCALE = 1.8) and the 2 m grid.
 *
 * Grid axes: rows along +Z (gz), columns along +X (gx).
 */

const G = "grass";
const D = "dirt";
const S = "stone";
const P = "path";

export const TEST_TILE_MAP = [
  // gz=0  z=-10
  [G, G, G, G, G, G, G, G, G, G, G, G],
  // gz=1  z=-8  — under train tail / back
  [D, D, D, D, D, D, D, G, G, G, G, G],
  // gz=2  z=-6  — under train front / rails
  [D, D, D, D, D, D, D, G, G, G, G, G],
  // gz=3  z=-4
  [G, G, G, G, G, G, G, G, G, G, G, G],
  // gz=4  z=-2
  [G, G, G, G, G, G, G, G, G, G, G, G],
  // gz=5  z=0   — hut platform front
  [S, S, S, S, S, G, G, G, G, G, G, G],
  // gz=6  z=+2  — hut sits here
  [S, S, S, S, S, G, G, G, G, G, G, G],
  // gz=7  z=+4  — hut platform back
  [S, S, S, S, S, G, G, G, G, G, G, G],
  // gz=8  z=+6
  [G, G, G, G, G, G, G, G, G, G, G, G],
  // gz=9  z=+8  — walkway toward spawn
  [G, G, G, G, P, P, G, G, G, G, G, G],
  // gz=10 z=+10 — spawn row
  [G, G, G, G, P, P, G, G, G, G, G, G],
  // gz=11 z=+12
  [G, G, G, G, G, G, G, G, G, G, G, G],
];

/** World position of cell (0,0)'s corner. Map spans X[-36, -12], Z[-10, +14]. */
export const TEST_TILE_MAP_ORIGIN = [-36, 0, -10];
