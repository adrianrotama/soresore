import { collisionForKind } from "./environmentModels";
import { gridToWorld, TILE_SIZE } from "./tileGrid";
import { surfaceYAt } from "./world";

function cellKey(ix, iz) {
  return `${ix},${iz}`;
}

/** Three.js Y rotation: local +X/+Z → world XZ (meters). */
function rotateXZ(x, z, cos, sin) {
  return {
    x: x * cos + z * sin,
    z: -x * sin + z * cos,
  };
}

/** Registry collision merged with optional per-placement `deco.collisionOverride`. */
export function resolveCollisionForDeco(deco) {
  const base = collisionForKind(deco.kind);
  const override = deco.collisionOverride;
  if (!override) return base?.blocks ? base : null;
  if (!base?.blocks && !override?.blocks) return null;
  return { blocks: true, ...base, ...override };
}

function resolveAnchorGrid(deco, collision) {
  const rot = deco.rotation ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const off = collision.offset ?? [0, 0, 0];
  const shifted = rotateXZ(off[0], off[2] ?? 0, cos, sin);
  return {
    gx: deco.gx + shifted.x / TILE_SIZE,
    gz: deco.gz + shifted.z / TILE_SIZE,
    cos,
    sin,
  };
}

function localCorners(cellsX, cellsZ, anchor) {
  if (anchor === "corner") {
    return [
      [0, 0],
      [cellsX, 0],
      [cellsX, cellsZ],
      [0, cellsZ],
    ];
  }
  return [
    [-cellsX / 2, -cellsZ / 2],
    [cellsX / 2, -cellsZ / 2],
    [cellsX / 2, cellsZ / 2],
    [-cellsX / 2, cellsZ / 2],
  ];
}

/**
 * Rectangular footprint in local cell units (cellsX × cellsZ), rotated with
 * `deco.rotation`. Default anchor `center` matches mesh pivot at gx/gz.
 */
function addRotatedRectFootprint(set, deco, collision) {
  const cellsX = collision.cellsX ?? collision.cells ?? 1;
  const cellsZ = collision.cellsZ ?? collision.cells ?? cellsX;
  const anchor = collision.anchor ?? "center";
  const { gx: anchorGx, gz: anchorGz, cos, sin } = resolveAnchorGrid(
    deco,
    collision
  );

  let minGx = Infinity;
  let maxGx = -Infinity;
  let minGz = Infinity;
  let maxGz = -Infinity;

  for (const [lx, lz] of localCorners(cellsX, cellsZ, anchor)) {
    const w = rotateXZ(lx, lz, cos, sin);
    const gx = anchorGx + w.x;
    const gz = anchorGz + w.z;
    minGx = Math.min(minGx, gx);
    maxGx = Math.max(maxGx, gx);
    minGz = Math.min(minGz, gz);
    maxGz = Math.max(maxGz, gz);
  }

  for (let ix = Math.floor(minGx); ix <= Math.floor(maxGx); ix++) {
    for (let iz = Math.floor(minGz); iz <= Math.floor(maxGz); iz++) {
      set.add(cellKey(ix, iz));
    }
  }
}

/** Cells blocked by a single decoration (for debug, not the global union). */
export function cellsForDecoration(deco, collision) {
  const set = new Set();
  addRotatedRectFootprint(set, deco, collision);
  return set;
}

function applyCollisionToSet(set, deco, collision) {
  addRotatedRectFootprint(set, deco, collision);
}

/** Build once per world — attach to `world.decorationBlocked` (see testWorld.js). */
export function buildDecorationBlockedSet(world) {
  const blocked = new Set();
  const decorations = world?.decorations;
  if (!decorations) return blocked;

  for (const deco of decorations) {
    const collision = resolveCollisionForDeco(deco);
    if (!collision?.blocks) continue;
    applyCollisionToSet(blocked, deco, collision);
  }

  return blocked;
}

export function isDecorationBlocked(world, gx, gz) {
  const blocked = world?.decorationBlocked;
  if (!blocked?.size) return false;
  return blocked.has(cellKey(Math.floor(gx), Math.floor(gz)));
}

/**
 * Debug wireframe for the configured footprint (same geometry as blocking).
 */
export function resolveDecorationDebugBox(world, deco, collision) {
  const cellsX = collision.cellsX ?? collision.cells ?? 1;
  const cellsZ = collision.cellsZ ?? collision.cells ?? cellsX;
  const anchor = collision.anchor ?? "center";
  const rot = deco.rotation ?? 0;
  const { gx: anchorGx, gz: anchorGz } = resolveAnchorGrid(deco, collision);

  let centerGx = anchorGx;
  let centerGz = anchorGz;
  if (anchor === "corner") {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const centerG = rotateXZ(cellsX / 2, cellsZ / 2, cos, sin);
    centerGx = anchorGx + centerG.x;
    centerGz = anchorGz + centerG.z;
  }

  const [cx, , cz] = gridToWorld(centerGx, centerGz, world.origin);
  const cy = surfaceYAt(world, centerGx, centerGz);

  return {
    position: [cx, cy + 0.3, cz],
    size: [cellsX * TILE_SIZE, 0.5, cellsZ * TILE_SIZE],
    rotationY: rot,
  };
}

/**
 * Footprints for dev overlay: red = logical box, white = grid tiles for that deco.
 */
export function listDecorationCollisionFootprints(world) {
  const boxes = [];
  const cellMarkers = [];

  for (const deco of world?.decorations ?? []) {
    const collision = resolveCollisionForDeco(deco);
    if (!collision?.blocks) continue;

    const keyBase = `deco-${deco.kind}-${deco.gx}-${deco.gz}`;
    boxes.push({
      key: keyBase,
      ...resolveDecorationDebugBox(world, deco, collision),
    });

    for (const cellKeyStr of cellsForDecoration(deco, collision)) {
      const [ix, iz] = cellKeyStr.split(",").map(Number);
      const gx = ix + 0.5;
      const gz = iz + 0.5;
      const [cx, , cz] = gridToWorld(gx, gz, world.origin);
      const cy = surfaceYAt(world, gx, gz) + 0.08;
      cellMarkers.push({
        key: `${keyBase}-cell-${cellKeyStr}`,
        position: [cx, cy, cz],
        size: [TILE_SIZE, 0.08, TILE_SIZE],
        rotationY: 0,
      });
    }
  }

  return { boxes, cellMarkers };
}
