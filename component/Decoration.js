"use client";

import { cellSurfaceWorld } from "@/lib/world";

/**
 * Placeholder prop — small orange box. Swap with GLB-based components
 * (tree, bench, sign) once assets land. The contract: a Decoration's mesh
 * origin is at its FEET, so placing at cellSurfaceWorld() drops it on the tile.
 */
function MarkerProp() {
  return (
    <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
      <boxGeometry args={[0.6, 1, 0.6]} />
      <meshToonMaterial color="#d97a55" />
    </mesh>
  );
}

/**
 * Add new decoration kinds here:
 *   tree: TreeProp,
 *   bench: BenchProp,
 *   sign: SignProp,
 * Each component should render its mesh standing on local y = 0 (origin at feet).
 */
const PROP_COMPONENTS = {
  marker: MarkerProp,
};

/**
 * Render one decoration at a grid cell, lifted to the cell's surface Y.
 *
 * @param {object} props
 * @param {{ map: any[][], origin: [number, number, number] }} props.world
 * @param {{ kind: string, gx: number, gz: number, rotation?: number }} props.deco
 */
export default function Decoration({ world, deco }) {
  const Component = PROP_COMPONENTS[deco.kind];
  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Decoration] unknown kind: ${deco.kind}`);
    }
    return null;
  }

  const position = cellSurfaceWorld(world, deco.gx, deco.gz);

  return (
    <group position={position} rotation={[0, deco.rotation ?? 0, 0]}>
      <Component />
    </group>
  );
}
