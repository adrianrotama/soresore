"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import TileModel from "@/component/TileModel";
import { gridToWorld } from "@/lib/tileGrid";
import {
  PEDESTAL_TILE_URL,
  TILE_PALETTES,
  DEFAULT_TILE_KEY,
} from "@/lib/tileModels";
import { normalizeCell, TILE_LEVEL_HEIGHT } from "@/lib/world";

useGLTF.preload(PEDESTAL_TILE_URL);

function paletteFor(tileType) {
  return TILE_PALETTES[tileType] ?? TILE_PALETTES[DEFAULT_TILE_KEY];
}

function TileMapInner({ map, origin = [0, 0, 0] }) {
  return (
    <group name="tile-map">
      {map.map((row, gz) =>
        row.map((rawCell, gx) => {
          const cell = normalizeCell(rawCell);
          if (!cell) return null;
          const [wx, baseY, wz] = gridToWorld(gx, gz, origin);
          const y = baseY + cell.level * TILE_LEVEL_HEIGHT;
          return (
            <TileModel
              key={`${gx}-${gz}-${cell.type}-${cell.level}`}
              url={PEDESTAL_TILE_URL}
              palette={paletteFor(cell.type)}
              position={[wx, y, wz]}
            />
          );
        })
      )}
    </group>
  );
}

/**
 * Render a 2D grid of tile keys (e.g. "grass", "path", "sand").
 * All cells share the pedestal mesh; per-tile palette repaints vertex colors at load.
 *
 * @param {(string | { type: string, level?: number })[][]} map — rows along +Z, columns along +X
 * @param {[number, number, number]} origin — world corner of cell (0,0)
 */
export default function TileMap({ map, origin = [0, 0, 0] }) {
  return (
    <Suspense fallback={null}>
      <TileMapInner map={map} origin={origin} />
    </Suspense>
  );
}
