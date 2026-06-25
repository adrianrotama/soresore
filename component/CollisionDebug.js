"use client";

import { useMemo } from "react";
import { listDecorationCollisionFootprints } from "@/lib/decorationCollision";

/** Red = configured footprint (cellsX × cellsZ, rotated). Tune in ENV_REGISTRY. */
const COLOR_LOGICAL = "#ff4444";

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
 *
 * Collision is world-space oriented boxes (meters). Restart dev after registry edits.
 */
export default function CollisionDebug({ world }) {
  const { boxes } = useMemo(() => listDecorationCollisionFootprints(world), [world]);

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
    </group>
  );
}
