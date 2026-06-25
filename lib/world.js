import {
  DEFAULT_PLAYER_BLOCK_RADIUS,
  isBlockedByDecorationsAtGrid,
} from "./decorationCollision";
import { gridToWorld } from "./tileGrid";
import { TILE_SIZE } from "./tileGrid";

/**
 * Single source of truth for "where is the ground?" across the world.
 *
 * A world is `{ map, origin, decorations }`. Cells are either:
 *   - "grass"                       → shorthand, level 0
 *   - { type: "grass", level: 1 }   → raised one step
 *
 * surfaceYAt(world, gx, gz) — tile top Y (decorations, mesh anchor).
 * walkSurfaceYAt(world, gx, gz) — player ground-snap (+ optional cell.surfaceYOffset).
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
  const cell = {
    type: rawCell.type,
    level: rawCell.level ?? 0,
    rotation: rawCell.rotation ?? 0,
  };
  if (typeof rawCell.slopePart === "number") {
    cell.slopePart = rawCell.slopePart;
  }
  if (typeof rawCell.slopeSpan === "number") {
    cell.slopeSpan = rawCell.slopeSpan;
  }
  if (typeof rawCell.slopeRise === "number") {
    cell.slopeRise = rawCell.slopeRise;
  }
  if (typeof rawCell.surfaceType === "string") {
    cell.surfaceType = rawCell.surfaceType;
  }
  if (rawCell.walkable === true || rawCell.walkable === false) {
    cell.walkable = rawCell.walkable;
  }
  if (typeof rawCell.surfaceYOffset === "number") {
    cell.surfaceYOffset = rawCell.surfaceYOffset;
  }
  return cell;
}

/** Per-cell override beats `TILE_INFO` default (e.g. bridge ford: water look, path walk). */
export function isCellWalkable(cell) {
  if (!cell) return false;
  if (cell.walkable === true) return true;
  if (cell.walkable === false) return false;
  // Keep in sync with TILE_INFO.walkable in lib/tileModels.js
  return cell.type !== "water";
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

/** Default slope run length (tiles) and rise (level steps). Override per cell. */
export const DEFAULT_SLOPE_SPAN = 3;
export const DEFAULT_SLOPE_RISE = 1;

export function slopeSpanOf(cell) {
  return cell?.slopeSpan ?? DEFAULT_SLOPE_SPAN;
}

export function slopeRiseOf(cell) {
  return cell?.slopeRise ?? DEFAULT_SLOPE_RISE;
}

export function slopeProgress01(cell, gx, gz) {
  const part = Number.isFinite(cell?.slopePart) ? cell.slopePart : 0;
  const span = slopeSpanOf(cell);
  return clamp01((part + stairProgress01(cell, gx, gz)) / span);
}

/** Walk height index on a slope (low end = cell.level, high end = cell.level + rise). */
export function slopeHeightIndex(cell, gx, gz) {
  return cell.level + slopeProgress01(cell, gx, gz) * slopeRiseOf(cell);
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

/** World XZ offset from `slopePart: 0` cell center to the run midpoint. */
export function slopeMeshWorldOffset(cell) {
  const climb = stairClimbDirection(cell);
  const span = slopeSpanOf(cell);
  const dist = ((span - 1) * TILE_SIZE) / 2;
  return { x: climb.x * dist, z: climb.z * dist };
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
  if (cell.type === "slope") {
    return slopeHeightIndex(cell, gx, gz);
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

function isStairCell(cell) {
  return cell?.type === "stair";
}

function isSlopeCell(cell) {
  return cell?.type === "slope";
}

/**
 * One grid step (possibly fractional endpoints) between two positions.
 *
 * Flat↔flat: block climb (`toLevel > fromLevel`) and drops steeper than one
 * `cell.level` step (`fromLevel - toLevel > 1`).
 * Stair involved: require climb-axis alignment; allow at most one height-index
 * unit of rise or drop per step along the slope.
 * Slope: height-index rules only — may step sideways off the ramp onto flats.
 */
function canMoveStep(world, fromGx, fromGz, toGx, toGz) {
  const { ix: fromIx, iz: fromIz } = gridToCellIndex(fromGx, fromGz);
  const { ix: toIx, iz: toIz } = gridToCellIndex(toGx, toGz);
  if (fromIx === toIx && fromIz === toIz) {
    return !isBlockedByDecorationsAtGrid(
      world,
      toGx,
      toGz,
      DEFAULT_PLAYER_BLOCK_RADIUS
    );
  }

  const toCell = getCell(world, toGx, toGz);
  if (!toCell) return false;
  if (!isCellWalkable(toCell)) return false;
  if (
    isBlockedByDecorationsAtGrid(world, toGx, toGz, DEFAULT_PLAYER_BLOCK_RADIUS)
  ) {
    return false;
  }

  const fromCell = getCell(world, fromGx, fromGz);

  const dgx = toGx - fromGx;
  const dgz = toGz - fromGz;

  const fromIsRamp = fromCell?.type === "stair" || fromCell?.type === "slope";
  const toIsRamp = toCell.type === "stair" || toCell.type === "slope";

  if (!fromIsRamp && !toIsRamp) {
    const fromLevel = fromCell?.level ?? 0;
    const toLevel = toCell.level;
    if (toLevel > fromLevel) return false;
    if (fromLevel - toLevel > 1) return false;
    return true;
  }

  if (!fromIsRamp && toIsRamp) {
    if (isStairCell(toCell) && !stairAxisAligned(toCell, dgx, dgz)) return false;
  } else if (fromIsRamp && !toIsRamp) {
    if (isStairCell(fromCell) && !stairAxisAligned(fromCell, dgx, dgz)) return false;
  }

  const fromH = walkHeightIndex(world, fromGx, fromGz);
  const toH = walkHeightIndex(world, toGx, toGz);

  if (fromH > toH + 1 + HEIGHT_EPS) return false;

  if (toH > fromH + HEIGHT_EPS) {
    const rise = toH - fromH;
    if (rise > 1 + HEIGHT_EPS) return false;
    const rampCell = fromIsRamp ? fromCell : toCell;
    if (isStairCell(rampCell) && !stairAxisAligned(rampCell, dgx, dgz)) return false;
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

  if (fromIx === toIx && fromIz === toIz) {
    return canMoveStep(world, fromGx, fromGz, toGx, toGz);
  }

  if (fromIx !== toIx && fromIz !== toIz) {
    return (
      canMoveStep(world, fromGx, fromGz, toGx, fromIz) &&
      canMoveStep(world, fromGx, fromGz, fromIx, toGz)
    );
  }

  return canMoveStep(world, fromGx, fromGz, toGx, toGz);
}

/**
 * Tile top Y at (gx, gz) — mesh / decoration anchor (ignores walk-only offsets).
 * Returns origin Y for out-of-bounds (treat as ambient ground).
 */
export function surfaceYAt(world, gx, gz) {
  const cell = getCell(world, gx, gz);
  const baseY = world?.origin?.[1] ?? 0;
  if (!cell) return baseY;
  if (cell.type === "stair") {
    return baseY + (cell.level + 2) * TILE_LEVEL_HEIGHT;
  }
  if (cell.type === "slope") {
    return baseY + slopeHeightIndex(cell, gx, gz) * TILE_LEVEL_HEIGHT;
  }
  return baseY + (cell.level + 1) * TILE_LEVEL_HEIGHT;
}

/**
 * Walk height for player ground-snap — tile top plus optional per-cell lift
 * (e.g. bridge ford BW tiles) without moving decoration anchors.
 */
export function walkSurfaceYAt(world, gx, gz) {
  const cell = getCell(world, gx, gz);
  if (cell?.type === "stair") {
    return surfaceYAt(world, gx, gz);
  }
  if (cell?.type === "slope") {
    return surfaceYAt(world, gx, gz);
  }
  const lift = cell?.surfaceYOffset ?? 0;
  return surfaceYAt(world, gx, gz) + lift;
}

/** World [x, y, z] to drop an object so its base sits on the tile top. */
export function cellSurfaceWorld(world, gx, gz) {
  const [wx, , wz] = gridToWorld(gx, gz, world.origin);
  return [wx, surfaceYAt(world, gx, gz), wz];
}
