import { gridToWorld } from "./tileGrid";

/**
 * Single source of truth for "where is the ground?" across the world.
 *
 * A world is `{ map, origin, decorations }`. Cells are either:
 *   - "grass"                       → shorthand, level 0
 *   - { type: "grass", level: 1 }   → raised one step
 *
 * surfaceYAt(world, gx, gz) is the Y everything else queries (decorations,
 * future player ground-snap, slope rules).
 */

/** World Y per elevation step — matches pedestal mesh height (block-grass-large.glb). */
export const TILE_LEVEL_HEIGHT = 1.0;

/** Normalize a raw cell to its full form. */
export function normalizeCell(rawCell) {
  if (rawCell == null) return null;
  if (typeof rawCell === "string") return { type: rawCell, level: 0 };
  return { type: rawCell.type, level: rawCell.level ?? 0 };
}

export function getCell(world, gx, gz) {
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const row = world.map[iz];
  if (!row) return null;
  return normalizeCell(row[ix]);
}

/**
 * World Y of the walkable top of cell (gx, gz).
 * Returns 0 for out-of-bounds (treat as ambient ground).
 */
export function surfaceYAt(world, gx, gz) {
  const cell = getCell(world, gx, gz);
  if (!cell) return 0;
  return (cell.level + 1) * TILE_LEVEL_HEIGHT;
}

/** World [x, y, z] to drop an object so its base sits on the cell surface. */
export function cellSurfaceWorld(world, gx, gz) {
  const [wx, , wz] = gridToWorld(gx, gz, world.origin);
  return [wx, surfaceYAt(world, gx, gz), wz];
}
