import { collisionForKind } from "./environmentModels";
import { gridToWorld, TILE_SIZE } from "./tileGrid";
import { surfaceYAt, worldToGrid } from "./world";

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

export const DEFAULT_PLAYER_BLOCK_RADIUS = 0.35;

/** Registry collision merged with optional per-placement `deco.collisionOverride`. */
export function resolveCollisionForDeco(deco) {
  const base = collisionForKind(deco.kind);
  const override = deco.collisionOverride;
  if (!override) return base?.blocks ? base : null;
  if (!base?.blocks && !override?.blocks) return null;
  return { blocks: true, ...base, ...override };
}

function resolveHalfExtentsMeters(collision) {
  if (!collision?.blocks) return null;
  if (Array.isArray(collision.halfExtents) && collision.halfExtents.length >= 2) {
    return { halfX: collision.halfExtents[0], halfZ: collision.halfExtents[1] };
  }

  const cellsX = collision.cellsX ?? collision.cells ?? 1;
  const cellsZ = collision.cellsZ ?? collision.cells ?? cellsX;
  return { halfX: (cellsX * TILE_SIZE) / 2, halfZ: (cellsZ * TILE_SIZE) / 2 };
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

function landmarkGridAnchor(world, landmark) {
  const { gx, gz } = worldToGrid(
    world,
    landmark.position[0],
    landmark.position[2]
  );
  return { gx, gz, rotation: landmark.rotation ?? 0 };
}

function addLandmarkFootprint(set, world, landmark) {
  const collision = landmark.collision;
  if (!collision?.blocks) return;
  addRotatedRectFootprint(set, landmarkGridAnchor(world, landmark), collision);
}

/** Decorations + landmarks with `collision.blocks` (see testWorld.js). */
export function buildWorldBlockedSet(world) {
  const blocked = buildDecorationBlockedSet(world);
  for (const landmark of world?.landmarks ?? []) {
    addLandmarkFootprint(blocked, world, landmark);
  }
  return blocked;
}

export function isDecorationBlocked(world, gx, gz) {
  const blocked = world?.decorationBlocked;
  if (!blocked?.size) return false;
  return blocked.has(cellKey(Math.floor(gx), Math.floor(gz)));
}

function resolveAnchorWorldXZFromGrid(world, deco, collision) {
  const rot = deco.rotation ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const anchor = collision.anchor ?? "center";
  const { halfX, halfZ } = resolveHalfExtentsMeters(collision) ?? {};
  if (!Number.isFinite(halfX) || !Number.isFinite(halfZ)) return null;

  const [baseX, , baseZ] = gridToWorld(deco.gx, deco.gz, world?.origin ?? [0, 0, 0]);

  const off = collision.offset ?? [0, 0, 0];
  const shifted = rotateXZ(off[0] ?? 0, off[2] ?? 0, cos, sin);
  let x = baseX + shifted.x;
  let z = baseZ + shifted.z;

  // If the anchor is the box corner, convert to the center for OBB tests.
  if (anchor === "corner") {
    const cornerToCenter = rotateXZ(halfX, halfZ, cos, sin);
    x += cornerToCenter.x;
    z += cornerToCenter.z;
  }

  return { x, z, rotationY: rot, halfX, halfZ };
}

function resolveAnchorWorldXZFromLandmark(landmark, collision) {
  const rot = landmark.rotation ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const anchor = collision.anchor ?? "center";
  const { halfX, halfZ } = resolveHalfExtentsMeters(collision) ?? {};
  if (!Number.isFinite(halfX) || !Number.isFinite(halfZ)) return null;

  let x = landmark.position[0];
  let z = landmark.position[2];

  const off = collision.offset ?? [0, 0, 0];
  const shifted = rotateXZ(off[0] ?? 0, off[2] ?? 0, cos, sin);
  x += shifted.x;
  z += shifted.z;

  if (anchor === "corner") {
    const cornerToCenter = rotateXZ(halfX, halfZ, cos, sin);
    x += cornerToCenter.x;
    z += cornerToCenter.z;
  }

  return { x, z, rotationY: rot, halfX, halfZ };
}

/**
 * Build per-decoration oriented boxes in world XZ.
 * Stored on `world.collisionVolumes` (see testWorld.js).
 */
export function buildCollisionVolumes(world) {
  const volumes = [];

  for (const deco of world?.decorations ?? []) {
    const collision = resolveCollisionForDeco(deco);
    if (!collision?.blocks) continue;
    const v = resolveAnchorWorldXZFromGrid(world, deco, collision);
    if (!v) continue;
    volumes.push({ key: `deco-${deco.kind}-${deco.gx}-${deco.gz}`, ...v });
  }

  for (const landmark of world?.landmarks ?? []) {
    const collision = landmark.collision;
    if (!collision?.blocks) continue;
    const v = resolveAnchorWorldXZFromLandmark(landmark, collision);
    if (!v) continue;
    volumes.push({ key: `landmark-${landmark.kind}-${landmark.position?.[0]}-${landmark.position?.[2]}`, ...v });
  }

  return volumes;
}

function circleIntersectsObbXZ(cx, cz, radius, obb) {
  const rot = obb.rotationY ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  // World -> box local (rotate by -rot).
  const dx = cx - obb.x;
  const dz = cz - obb.z;
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;

  const clampedX = Math.max(-obb.halfX, Math.min(obb.halfX, lx));
  const clampedZ = Math.max(-obb.halfZ, Math.min(obb.halfZ, lz));

  const ox = lx - clampedX;
  const oz = lz - clampedZ;
  return ox * ox + oz * oz <= radius * radius;
}

export function isBlockedByDecorationsAtWorldXZ(
  world,
  worldX,
  worldZ,
  radius = DEFAULT_PLAYER_BLOCK_RADIUS
) {
  const volumes = world?.collisionVolumes;
  if (!Array.isArray(volumes) || volumes.length === 0) return false;
  for (const obb of volumes) {
    if (circleIntersectsObbXZ(worldX, worldZ, radius, obb)) return true;
  }
  return false;
}

export function isBlockedByDecorationsAtGrid(
  world,
  gx,
  gz,
  radius = DEFAULT_PLAYER_BLOCK_RADIUS
) {
  if (!world?.origin) return false;
  // `worldToGrid` returns a coordinate where integer boundaries are cell edges.
  // So gx/gz are already in "edge space" (cell center is n + 0.5). Converting
  // back must NOT add the extra half-tile offset that `gridToWorld` applies.
  const wx = world.origin[0] + gx * TILE_SIZE;
  const wz = world.origin[2] + gz * TILE_SIZE;
  return isBlockedByDecorationsAtWorldXZ(world, wx, wz, radius);
}

/**
 * Debug wireframe for the configured footprint (same geometry as blocking).
 */
export function resolveDecorationDebugBox(world, deco, collision) {
  const rot = deco.rotation ?? 0;
  const { halfX, halfZ } = resolveHalfExtentsMeters(collision) ?? {};
  const anchorWorld = resolveAnchorWorldXZFromGrid(world, deco, collision);
  if (!anchorWorld || !Number.isFinite(halfX) || !Number.isFinite(halfZ)) {
    return {
      position: [0, 0, 0],
      size: [0.01, 0.01, 0.01],
      rotationY: rot,
    };
  }
  const { x: cx, z: cz } = anchorWorld;
  const { gx: cgx, gz: cgz } = worldToGrid(world, cx, cz);
  const cy = surfaceYAt(world, cgx, cgz);

  return {
    position: [cx, cy + 0.3, cz],
    size: [halfX * 2, 0.5, halfZ * 2],
    rotationY: rot,
  };
}

/**
 * Footprints for dev overlay: red = logical box, white = grid tiles for that deco.
 */
export function listDecorationCollisionFootprints(world) {
  const boxes = [];

  for (const deco of world?.decorations ?? []) {
    const collision = resolveCollisionForDeco(deco);
    if (!collision?.blocks) continue;
    const keyBase = `deco-${deco.kind}-${deco.gx}-${deco.gz}`;
    boxes.push({
      key: keyBase,
      ...resolveDecorationDebugBox(world, deco, collision),
    });
  }

  return { boxes, cellMarkers: [] };
}
