"use client";

import { useFrame } from "@react-three/fiber";
import { TILE_SIZE } from "@/lib/tileGrid";
import {
  getFoamMaterial,
  getSeabedMaterial,
  getWaterMaterial,
  updateWaterTime,
} from "@/lib/waterMaterial";

// Exactly tile-sized: world-space waves are continuous, so adjacent tiles share
// edge heights and blend seamlessly. Any overlap instead double-blends the
// transparent planes into a visible grid.
const PLANE_SIZE = TILE_SIZE;
const SEGMENTS = 6; // enough for smooth gentle waves, still cheap
const FOAM_WIDTH = 0.55;
const FOAM_LIFT = 0.02; // above the water surface to avoid z-fighting
const SEABED_LIFT = -0.06; // just under the surface; vertex shader dips further
const HALF = TILE_SIZE / 2;

/** Drives the shared water/foam clocks once per frame. Mount exactly one. */
export function WaterClock() {
  useFrame((state) => updateWaterTime(state.clock.elapsedTime));
  return null;
}

const FOAM_EDGES = {
  n: { pos: [0, FOAM_LIFT, -HALF], rotY: 0 },
  s: { pos: [0, FOAM_LIFT, HALF], rotY: 0 },
  e: { pos: [HALF, FOAM_LIFT, 0], rotY: Math.PI / 2 },
  w: { pos: [-HALF, FOAM_LIFT, 0], rotY: Math.PI / 2 },
};

function FoamEdge({ edge }) {
  const { pos, rotY } = FOAM_EDGES[edge];
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={getFoamMaterial()}>
        <planeGeometry args={[TILE_SIZE, FOAM_WIDTH]} />
      </mesh>
    </group>
  );
}

/**
 * One stylized-water cell: animated toon surface + foam on land edges.
 * Optional sandy seabed (sea only — river stays opaque teal, no sand).
 */
export default function WaterTile({ position, foamEdges, showSeabed = false }) {
  return (
    <group position={position}>
      {showSeabed ? (
        <mesh
          position={[0, SEABED_LIFT, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={getSeabedMaterial()}
          castShadow={false}
          receiveShadow={false}
        >
          <planeGeometry args={[PLANE_SIZE, PLANE_SIZE, SEGMENTS, SEGMENTS]} />
        </mesh>
      ) : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={getWaterMaterial()}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE, SEGMENTS, SEGMENTS]} />
      </mesh>
      {foamEdges?.n ? <FoamEdge edge="n" /> : null}
      {foamEdges?.s ? <FoamEdge edge="s" /> : null}
      {foamEdges?.e ? <FoamEdge edge="e" /> : null}
      {foamEdges?.w ? <FoamEdge edge="w" /> : null}
    </group>
  );
}
