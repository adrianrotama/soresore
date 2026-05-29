"use client";

import { useMemo } from "react";
import { listDecorationCollisionFootprints } from "@/lib/decorationCollision";

/** Red = configured footprint (cellsX × cellsZ, rotated). Tune in ENV_REGISTRY. */
const COLOR_LOGICAL = "#ff4444";
/** White = 2 m tiles this decoration blocks (per object, not global union). */
const COLOR_BLOCKED_TILE = "#ffffff";

function WireBox({ position, size, rotationY, color }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <boxGeometry args={size} />
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.95}
        depthTest={false}
      />
    </mesh>
  );
}

/**
 * Dev-only collision overlay (npm run dev).
 *
 * - Red: logical box (`cellsX` × `cellsZ`, `anchor`, `offset`). Tune size/shift.
 * - White: 2 m tiles this decoration adds to the blocked set (per object).
 *
 * Red can extend past white when a dimension is &lt; 1 cell — only white tiles
 * block movement. Thin rails: widen with `cellsZ` or shift with `offset`, not
 * only `cellsX` (center anchor grows both ways). Restart dev after registry edits.
 */
export default function CollisionDebug({ world }) {
  const { boxes, cellMarkers } = useMemo(
    () => listDecorationCollisionFootprints(world),
    [world]
  );

  return (
    <group name="collision-debug">
      {boxes.map((box) => (
        <WireBox
          key={box.key}
          position={box.position}
          size={box.size}
          rotationY={box.rotationY}
          color={COLOR_LOGICAL}
        />
      ))}
      {cellMarkers.map((cell) => (
        <WireBox
          key={cell.key}
          position={cell.position}
          size={cell.size}
          rotationY={cell.rotationY}
          color={COLOR_BLOCKED_TILE}
        />
      ))}
    </group>
  );
}
