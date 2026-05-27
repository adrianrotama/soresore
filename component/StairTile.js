"use client";

import { useMemo } from "react";
import { BoxGeometry, Color, MeshToonMaterial } from "three";

/** Match pedestal footprint / height (GAME.md tile contract). */
const FOOTPRINT = 2.082;
const HEIGHT = 1.0;
const STEPS = 4;

/**
 * Low-poly stair block (procedural). Replace with GLB via TileModel when
 * `public/images/tiles/stair.glb` is added (Kenney Platformer Kit wedge/stairs).
 *
 * rotation 0: climb toward +Z (low edge at −Z, high at +Z).
 */
export default function StairTile({
  palette,
  position = [0, 0, 0],
  rotation = 0,
}) {
  const parts = useMemo(() => {
    const top = new Color(palette.top);
    const side = new Color(palette.side);
    const depth = FOOTPRINT / STEPS;
    const stepH = HEIGHT / STEPS;
    const meshes = [];

    for (let i = 0; i < STEPS; i++) {
      const rise = (i + 1) * stepH;
      const zMin = -FOOTPRINT / 2 + i * depth;
      const zMax = zMin + depth;
      const geo = new BoxGeometry(FOOTPRINT, rise, depth);
      const mat = new MeshToonMaterial({
        color: i === STEPS - 1 ? top : side,
      });
      meshes.push({
        geo,
        mat,
        y: rise / 2,
        z: (zMin + zMax) / 2,
      });
    }
    return meshes;
  }, [palette.top, palette.side]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geo}
          material={part.mat}
          position={[0, part.y, part.z]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
