import { isDecorationBlocked } from "./decorationCollision";
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
 * player ground-snap, walkability rules).
 */

/** World Y per elevation step — matches pedestal mesh height (block-grass-large.glb). */
export const TILE_LEVEL_HEIGHT = 1.0;

/** |dot(move, stairAxis)| below this => sideways off/on a stair (blocked). */
const STAIR_AXIS_MIN_DOT = 0.5;

const HEIGHT_EPS = 1e-4;

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

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

/**
 * 0..1 progress along a stair cell (low end → high end).
 * Matches `StairTile` / `LocalPlayer` conventions.
 */
export function stairProgress01(cell, gx, gz) {
  const fx = gx - Math.floor(gx);
  const fz = gz - Math.floor(gz);
  const rot = cell.rotation ?? 0;

  if (Math.abs(rot) < 0.001) return clamp01(fz);
  if (Math.abs(rot - Math.PI / 2) < 0.001) return clamp01(fx);
  if (Math.abs(rot + Math.PI / 2) < 0.001) return clamp01(1 - fx);
  if (Math.abs(Math.abs(rot) - Math.PI) < 0.001) return clamp01(1 - fz);

  return clamp01(fz);
}

/** Unit climb direction on the XZ grid (stair low → high). */
export function stairClimbDirection(cell) {
  const rot = cell.rotation ?? 0;
  if (Math.abs(rot) < 0.001) return { x: 0, z: 1 };
  if (Math.abs(rot - Math.PI / 2) < 0.001) return { x: 1, z: 0 };
  if (Math.abs(rot + Math.PI / 2) < 0.001) return { x: -1, z: 0 };
  if (Math.abs(Math.abs(rot) - Math.PI) < 0.001) return { x: 0, z: -1 };
  return { x: 0, z: 1 };
}

/**
 * Walkable height index (Y / TILE_LEVEL_HEIGHT) at a grid position.
 * Flat top at (level + 1); stair interpolates level..level+1 inside the cell.
 */
export function walkHeightIndex(world, gx, gz) {
  const cell = getCell(world, gx, gz);
  if (!cell) return 0;
  if (cell.type === "stair") {
    return cell.level + stairProgress01(cell, gx, gz);
  }
  return cell.level + 1;
}

function moveDirection01(dgx, dgz) {
  const len = Math.hypot(dgx, dgz);
  if (len < 1e-6) return null;
  return { x: dgx / len, z: dgz / len };
}

function stairAxisAligned(cell, dgx, dgz) {
  const move = moveDirection01(dgx, dgz);
  if (!move) return true;
  const climb = stairClimbDirection(cell);
  return Math.abs(move.x * climb.x + move.z * climb.z) >= STAIR_AXIS_MIN_DOT;
}

/**
 * One grid step (possibly fractional endpoints) between two positions.
 *
 * Flat↔flat: block climb (`toLevel > fromLevel`) and drops steeper than one
 * `cell.level` step (`fromLevel - toLevel > 1`).
 * Stair involved: require climb-axis alignment; allow at most one height-index
 * unit of rise or drop per step along the slope.
 */
function canMoveStep(world, fromGx, fromGz, toGx, toGz) {
  const { ix: fromIx, iz: fromIz } = gridToCellIndex(fromGx, fromGz);
  const { ix: toIx, iz: toIz } = gridToCellIndex(toGx, toGz);
  if (fromIx === toIx && fromIz === toIz) {
    return !isDecorationBlocked(world, toGx, toGz);
  }

  const toCell = getCell(world, toGx, toGz);
  if (!toCell) return false;
  if (isDecorationBlocked(world, toGx, toGz)) return false;

  const fromCell = getCell(world, fromGx, fromGz);

  const dgx = toGx - fromGx;
  const dgz = toGz - fromGz;

  const fromIsStair = fromCell?.type === "stair";
  const toIsStair = toCell.type === "stair";

  if (!fromIsStair && !toIsStair) {
    const fromLevel = fromCell?.level ?? 0;
    const toLevel = toCell.level;
    if (toLevel > fromLevel) return false;
    if (fromLevel - toLevel > 1) return false;
    return true;
  }

  if (!fromIsStair && toIsStair) {
    if (!stairAxisAligned(toCell, dgx, dgz)) return false;
  } else if (fromIsStair && !toIsStair) {
    if (!stairAxisAligned(fromCell, dgx, dgz)) return false;
  }

  const fromH = walkHeightIndex(world, fromGx, fromGz);
  const toH = walkHeightIndex(world, toGx, toGz);

  if (fromH > toH + 1 + HEIGHT_EPS) return false;

  if (toH > fromH + HEIGHT_EPS) {
    const rise = toH - fromH;
    if (rise > 1 + HEIGHT_EPS) return false;
    const stairCell = fromIsStair ? fromCell : toCell;
    if (!stairAxisAligned(stairCell, dgx, dgz)) return false;
  }

  return true;
}

/**
 * Whether the player may move from grid position `from` to `to`.
 * Handles diagonal corner cuts via intermediate axis steps.
 */
export function canMoveTo(world, fromGx, fromGz, toGx, toGz) {
  if (!world?.map) return true;

  const { ix: fromIx, iz: fromIz } = gridToCellIndex(fromGx, fromGz);
  const { ix: toIx, iz: toIz } = gridToCellIndex(toGx, toGz);

  if (fromIx === toIx && fromIz === toIz) return true;

  if (fromIx !== toIx && fromIz !== toIz) {
    return (
      canMoveStep(world, fromGx, fromGz, toGx, fromIz) &&
      canMoveStep(world, fromGx, fromGz, fromIx, toGz)
    );
  }

  return canMoveStep(world, fromGx, fromGz, toGx, toGz);
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
