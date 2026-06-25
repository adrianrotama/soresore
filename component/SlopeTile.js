"use client";

import { useMemo } from "react";
import {
  MeshToonMaterial,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { TILE_SIZE } from "@/lib/tileGrid";
import { DEFAULT_SLOPE_RISE, DEFAULT_SLOPE_SPAN, TILE_LEVEL_HEIGHT } from "@/lib/world";

/** Match pedestal width (GAME.md tile contract). */
const FOOTPRINT = 2.082;

function makeWedgeGeometry(palette, span, rise) {
  const x = FOOTPRINT / 2;
  const z = (TILE_SIZE * span) / 2;
  const h = rise * TILE_LEVEL_HEIGHT;
  const top = new Color(palette.top);
  const side = new Color(palette.side);

  const A = [-x, 0, -z];
  const B = [x, 0, -z];
  const C = [x, 0, z];
  const D = [-x, 0, z];
  const E = [x, h, z];
  const F = [-x, h, z];

  const positions = [];
  const colors = [];

  const tri = (p0, p1, p2, c) => {
    positions.push(...p0, ...p1, ...p2);
    for (let i = 0; i < 3; i++) colors.push(c.r, c.g, c.b);
  };

  tri(A, F, E, top);
  tri(A, E, B, top);
  tri(A, B, C, side);
  tri(A, C, D, side);
  tri(D, C, E, side);
  tri(D, E, F, side);
  tri(A, D, F, side);
  tri(B, E, C, side);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function SlopeTile({
  palette,
  position = [0, 0, 0],
  rotation = 0,
  span = DEFAULT_SLOPE_SPAN,
  rise = DEFAULT_SLOPE_RISE,
}) {
  const geometry = useMemo(
    () => makeWedgeGeometry(palette, span, rise),
    [palette.top, palette.side, span, rise]
  );
  const material = useMemo(
    () =>
      new MeshToonMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    []
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
    </group>
  );
}
