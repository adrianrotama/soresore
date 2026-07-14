"use client";

import { Fragment, Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import TileModel from "@/component/TileModel";
import StairTile from "@/component/StairTile";
import SlopeTile from "@/component/SlopeTile";
import WaterTile, { WaterClock } from "@/component/WaterTile";
import { buildShoreDepthTexture, isSeaWater } from "@/lib/shoreDepth";
import { gridToWorld } from "@/lib/tileGrid";
import { setWaterDepthField } from "@/lib/waterMaterial";
import {
  PEDESTAL_TILE_URL,
  BRICK_TILE_URL,
  WATER_TILE_URL,
  TILE_PALETTES,
  DEFAULT_TILE_KEY,
  tileModelUrl,
  tileModelYOffset,
  tileUsesNativeColor,
} from "@/lib/tileModels";
import {
  normalizeCell,
  slopeMeshWorldOffset,
  slopeRiseOf,
  slopeSpanOf,
  TILE_LEVEL_HEIGHT,
} from "@/lib/world";

useGLTF.preload(PEDESTAL_TILE_URL);
useGLTF.preload(BRICK_TILE_URL);
useGLTF.preload(WATER_TILE_URL);

const FOOTPRINT = 2.082;

function paletteFor(tileType) {
  return TILE_PALETTES[tileType] ?? TILE_PALETTES[DEFAULT_TILE_KEY];
}

/** True when the cell at (gx, gz) exists and is water. */
function isWaterAt(map, gx, gz) {
  const cell = normalizeCell(map[gz]?.[gx]);
  return cell?.type === "water";
}

/**
 * Foam sits on any side facing a non-water neighbor (a shoreline). Sides that
 * face another water cell — or the open map edge (out of bounds) — get none,
 * so the open sea reads as endless rather than fenced in foam.
 */
function foamEdgesFor(map, gx, gz) {
  const shore = (nx, nz) => {
    if (map[nz]?.[nx] == null) return false; // map edge / open sea
    return !isWaterAt(map, nx, nz);
  };
  return {
    n: shore(gx, gz - 1),
    s: shore(gx, gz + 1),
    e: shore(gx + 1, gz),
    w: shore(gx - 1, gz),
  };
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
  useMemo(() => {
    const field = buildShoreDepthTexture(map);
    setWaterDepthField(field);
    return field;
  }, [map]);

  return (
    <group name="tile-map">
      <WaterClock />
      {map.map((row, gz) =>
        row.map((rawCell, gx) => {
          const cell = normalizeCell(rawCell);
          if (!cell) return null;
          const [wx, baseY, wz] = gridToWorld(gx, gz, origin);
          const y = baseY + cell.level * TILE_LEVEL_HEIGHT;
          const yOffset = tileModelYOffset(cell.type);
          const meshY = y + yOffset;
          const key = `${gx}-${gz}-${cell.type}-${cell.level}-${cell.rotation ?? 0}`;
          const palette =
            cell.type === "slope"
              ? paletteFor(cell.surfaceType ?? DEFAULT_TILE_KEY)
              : paletteFor(cell.type);

          // Bank: solid cliff plug from `bankBottomLevel` up to the tile's base.
          // Skip when the mesh already extends below the cell base (e.g. 2 m brick).
          const bankBottomLevel = Math.min(0, cell.level) - 1;
          const bankTopLevel = cell.level;
          const bankHeight =
            (bankTopLevel - bankBottomLevel) * TILE_LEVEL_HEIGHT;
          const bankY =
            baseY + ((bankBottomLevel + bankTopLevel) / 2) * TILE_LEVEL_HEIGHT;

          const bank =
            yOffset === 0 && cell.type !== "water" && cell.type !== "slope" ? (
              <TileBank
                color={palette.side}
                position={[wx, bankY, wz]}
                height={bankHeight}
              />
            ) : null;

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
          if (cell.type === "slope") {
            if (cell.slopePart !== 0) return null;
            const meshOff = slopeMeshWorldOffset(cell);
            return (
              <SlopeTile
                key={key}
                palette={palette}
                position={[wx + meshOff.x, y, wz + meshOff.z]}
                rotation={cell.rotation}
                span={slopeSpanOf(cell)}
                rise={slopeRiseOf(cell)}
              />
            );
          }
          if (cell.type === "water") {
            // Water surface aligns with the tile top of its level (matches sand
            // shorelines). Foam only on sides that meet land. Sandy seabed is
            // sea-only (level ≤ -2); river stays opaque teal.
            const surfaceY = baseY + (cell.level + 1) * TILE_LEVEL_HEIGHT;
            return (
              <WaterTile
                key={key}
                position={[wx, surfaceY, wz]}
                foamEdges={foamEdgesFor(map, gx, gz)}
                showSeabed={isSeaWater(cell)}
              />
            );
          }

          return (
            <Fragment key={key}>
              {bank}
              <TileModel
                url={tileModelUrl(cell.type)}
                palette={palette}
                position={[wx, meshY, wz]}
                nativeColor={tileUsesNativeColor(cell.type)}
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
