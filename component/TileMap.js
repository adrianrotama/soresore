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

useGLTF.preload(PEDESTAL_TILE_URL);

function paletteFor(tileKey) {
  return TILE_PALETTES[tileKey] ?? TILE_PALETTES[DEFAULT_TILE_KEY];
}

function TileMapInner({ map, origin = [0, 0, 0] }) {
  return (
    <group name="tile-map">
      {map.map((row, gz) =>
        row.map((tileKey, gx) => (
          <TileModel
            key={`${gx}-${gz}-${tileKey}`}
            url={PEDESTAL_TILE_URL}
            palette={paletteFor(tileKey)}
            position={gridToWorld(gx, gz, origin)}
          />
        ))
      )}
    </group>
  );
}

/**
 * Render a 2D grid of tile keys (e.g. "grass", "path", "sand").
 * All cells share the pedestal mesh; per-tile palette repaints vertex colors at load.
 *
 * @param {string[][]} map — rows along +Z, columns along +X
 * @param {[number, number, number]} origin — world corner of cell (0,0)
 */
export default function TileMap({ map, origin = [0, 0, 0] }) {
  return (
    <Suspense fallback={null}>
      <TileMapInner map={map} origin={origin} />
    </Suspense>
  );
}
