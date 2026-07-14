"use client";

import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from "three";
import { TILE_SIZE } from "./tileGrid";
import { TEST_TILE_MAP_ORIGIN } from "./testTileMap";
import { normalizeCell } from "./world";

/**
 * How many cells from shore before water counts as fully "deep" (depth = 1).
 * Wider = a broader shallow/sandy band near the shoreline.
 */
const MAX_SHORE_CELLS = 4;

function isWaterCell(rawCell) {
  return normalizeCell(rawCell)?.type === "water";
}

/** Open sea (south beach) — sandy seabed + shallow→deep gradient. River stays opaque teal. */
export function isSeaWater(rawCell) {
  const cell = normalizeCell(rawCell);
  return cell?.type === "water" && cell.level <= -2;
}

/**
 * Bake a shore-distance field for the map into a small RGBA DataTexture:
 * R (0..1) = 0 at land/shore, 1 in deep/open water. Multi-source BFS seeded
 * from every land cell, spreading only across water cells; open map edges are
 * not seeds, so the sea deepens toward the horizon.
 *
 * Sampled in the water/seabed shaders via world XZ:
 *   uv = (worldXZ - origin) / size   (cell centers land on texel centers)
 *
 * @param {(string | object)[][]} map — rows along +Z, columns along +X
 * @returns {{ texture: DataTexture, origin: [number, number], size: [number, number] }}
 */
export function buildShoreDepthTexture(map) {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;

  const dist = new Float32Array(rows * cols).fill(Infinity);
  const queue = [];

  // Seed BFS from land cells (distance 0).
  for (let gz = 0; gz < rows; gz++) {
    for (let gx = 0; gx < cols; gx++) {
      const cell = map[gz][gx];
      if (cell != null && !isWaterCell(cell)) {
        dist[gz * cols + gx] = 0;
        queue.push([gx, gz]);
      }
    }
  }

  // Spread across water cells only.
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let head = 0; head < queue.length; head++) {
    const [gx, gz] = queue[head];
    const d = dist[gz * cols + gx];
    for (const [dx, dz] of neighbors) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
      const nIdx = nz * cols + nx;
      if (dist[nIdx] !== Infinity) continue;
      if (!isWaterCell(map[nz][nx])) continue;
      dist[nIdx] = d + 1;
      queue.push([nx, nz]);
    }
  }

  const data = new Uint8Array(rows * cols * 4);
  for (let gz = 0; gz < rows; gz++) {
    for (let gx = 0; gx < cols; gx++) {
      const i = gz * cols + gx;
      const d = dist[i];
      // River water: force deep/opaque — no sandy shallows under the canal.
      // Sea keeps shoreline → deep (d=1 at first water cell → clear edge).
      let depth01;
      if (isWaterCell(map[gz][gx]) && !isSeaWater(map[gz][gx])) {
        depth01 = 1;
      } else if (d === Infinity) {
        depth01 = 1;
      } else if (d <= 0) {
        depth01 = 0;
      } else {
        depth01 = Math.min(1, (d - 1) / (MAX_SHORE_CELLS - 1));
      }
      const v = Math.round(depth01 * 255);
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
  }

  const texture = new DataTexture(
    data,
    cols,
    rows,
    RGBAFormat,
    UnsignedByteType
  );
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    origin: [TEST_TILE_MAP_ORIGIN[0], TEST_TILE_MAP_ORIGIN[2]],
    size: [cols * TILE_SIZE, rows * TILE_SIZE],
  };
}
