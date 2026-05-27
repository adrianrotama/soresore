"use client";

import { Fragment, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import TileModel from "@/component/TileModel";
import StairTile from "@/component/StairTile";
import { gridToWorld } from "@/lib/tileGrid";
import {
  PEDESTAL_TILE_URL,
  TILE_PALETTES,
  DEFAULT_TILE_KEY,
} from "@/lib/tileModels";
import { normalizeCell, TILE_LEVEL_HEIGHT } from "@/lib/world";

useGLTF.preload(PEDESTAL_TILE_URL);

const FOOTPRINT = 2.082;

function paletteFor(tileType) {
  return TILE_PALETTES[tileType] ?? TILE_PALETTES[DEFAULT_TILE_KEY];
}

/**
 * Square "cliff face" block painted in the side color. Plugs the rounded
 * pedestal seam at every level transition — pedestals curve inward at top/bottom
 * which would otherwise leave a visible gap between neighbors at different levels.
 */
function TileBank({ color, position, height }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[FOOTPRINT, height, FOOTPRINT]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
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
          const key = `${gx}-${gz}-${cell.type}-${cell.level}-${cell.rotation ?? 0}`;
          const palette = paletteFor(cell.type);

          // Bank: solid cliff plug from `bankBottomLevel` up to the tile's base.
          // - Always extends one level below the tile itself, so rounded-edge
          //   seams between same-level neighbors are hidden too.
          // - For raised tiles (level > 0), extends down to Y=0 so the whole
          //   exposed cliff is solid.
          const bankBottomLevel = Math.min(0, cell.level) - 1;
          const bankTopLevel = cell.level;
          const bankHeight =
            (bankTopLevel - bankBottomLevel) * TILE_LEVEL_HEIGHT;
          const bankY =
            baseY + ((bankBottomLevel + bankTopLevel) / 2) * TILE_LEVEL_HEIGHT;

          const bank = (
            <TileBank
              color={palette.side}
              position={[wx, bankY, wz]}
              height={bankHeight}
            />
          );

          if (cell.type === "stair") {
            return (
              <Fragment key={key}>
                {bank}
                <StairTile
                  palette={palette}
                  position={[wx, y, wz]}
                  rotation={cell.rotation}
                />
              </Fragment>
            );
          }

          return (
            <Fragment key={key}>
              {bank}
              <TileModel
                url={PEDESTAL_TILE_URL}
                palette={palette}
                position={[wx, y, wz]}
              />
            </Fragment>
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
