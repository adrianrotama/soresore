/** World units per tile edge (see modular tile plan). */
export const TILE_SIZE = 2;

/**
 * Grid index → world position for a tile with bottom-center pivot at cell center.
 * @param {number} gx — column (increases +X)
 * @param {number} gz — row (increases +Z)
 * @param {[number, number, number]} [origin=[0, 0, 0]]
 */
export function gridToWorld(gx, gz, origin = [0, 0, 0]) {
  const half = TILE_SIZE / 2;
  return [
    origin[0] + gx * TILE_SIZE + half,
    origin[1],
    origin[2] + gz * TILE_SIZE + half,
  ];
}
