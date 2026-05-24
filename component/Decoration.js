"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS } from "@/lib/environmentModels";
import { cellSurfaceWorld } from "@/lib/world";

/**
 * Placeholder prop — small orange box. Swap with GLB-based components
 * (tree, sign) once assets land. The contract: a Decoration's mesh
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

function BenchProp() {
  return <EnvironmentModel url={ENV_MODELS.bench} />;
}

function TrashcanProp() {
  return <EnvironmentModel url={ENV_MODELS.trashcan} />;
}

function TreeProp() {
  return <EnvironmentModel url={ENV_MODELS.tree} />;
}

function TreeLargeProp() {
  return <EnvironmentModel url={ENV_MODELS.treeLarge} />;
}

function StreetLanternProp() {
  return <EnvironmentModel url={ENV_MODELS.streetLantern} />;
}

/**
 * Add new decoration kinds here:
 *   tree: TreeProp,
 *   sign: SignProp,
 * Each component should render its mesh standing on local y = 0 (origin at feet).
 */
const PROP_COMPONENTS = {
  marker: MarkerProp,
  bench: BenchProp,
  trashcan: TrashcanProp,
  tree: TreeProp,
  treeLarge: TreeLargeProp,
  streetLantern: StreetLanternProp,
};

useGLTF.preload(ENV_MODELS.bench);
useGLTF.preload(ENV_MODELS.trashcan);
useGLTF.preload(ENV_MODELS.tree);
useGLTF.preload(ENV_MODELS.treeLarge);
useGLTF.preload(ENV_MODELS.streetLantern);

/**
 * Render one decoration at a grid cell, lifted to the cell's surface Y.
 *
 * @param {object} props
 * @param {{ map: any[][], origin: [number, number, number] }} props.world
 * @param {{ kind: string, gx: number, gz: number, rotation?: number }} props.deco
 */
function DecorationInner({ world, deco }) {
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

export default function Decoration(props) {
  return (
    <Suspense fallback={null}>
      <DecorationInner {...props} />
    </Suspense>
  );
}
