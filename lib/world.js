import { gridToWorld } from "./tileGrid";
import { TILE_SIZE } from "./tileGrid";

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

/**
 * Convert world-space XZ to grid-space (gx,gz) where integer boundaries align
 * with cell edges (so Math.floor(gx/gz) yields the correct cell index).
 */
export function worldToGrid(world, wx, wz) {
  return {
    gx: (wx - world.origin[0]) / TILE_SIZE,
    gz: (wz - world.origin[2]) / TILE_SIZE,
  };
}

/** Grid-space gx/gz -> integer cell indices. */
export function gridToCellIndex(gx, gz) {
  return {
    ix: Math.floor(gx),
    iz: Math.floor(gz),
  };
}

/** Normalize a raw cell to its full form. */
export function normalizeCell(rawCell) {
  if (rawCell == null) return null;
  if (typeof rawCell === "string") {
    return { type: rawCell, level: 0, rotation: 0 };
  }
  return {
    type: rawCell.type,
    level: rawCell.level ?? 0,
    rotation: rawCell.rotation ?? 0,
  };
}

export function getCell(world, gx, gz) {
  const { ix, iz } = gridToCellIndex(gx, gz);
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
  if (cell.type === "stair") {
    return (cell.level + 2) * TILE_LEVEL_HEIGHT;
  }
  return (cell.level + 1) * TILE_LEVEL_HEIGHT;
}

/** World [x, y, z] to drop an object so its base sits on the cell surface. */
export function cellSurfaceWorld(world, gx, gz) {
  const [wx, , wz] = gridToWorld(gx, gz, world.origin);
  return [wx, surfaceYAt(world, gx, gz), wz];
}
