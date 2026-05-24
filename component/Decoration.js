"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS } from "@/lib/environmentModels";
import { cellSurfaceWorld } from "@/lib/world";

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

function RailroadStraightProp() {
  return (
    <EnvironmentModel
      url={ENV_MODELS.railroadStraight}
      scale={2}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
}

function RailCrossingProp() {
  return <EnvironmentModel
    url={ENV_MODELS.railCrossingLong}
    scale={0.02}
  />;
}

/**
 * Add new decoration kinds here:
 *   tree: TreeProp,
 *   sign: SignProp,
 * Each component should render its mesh standing on local y = 0 (origin at feet).
 */
const PROP_COMPONENTS = {
  bench: BenchProp,
  trashcan: TrashcanProp,
  tree: TreeProp,
  treeLarge: TreeLargeProp,
  streetLantern: StreetLanternProp,
  railroadStraight: RailroadStraightProp,
  railCrossing: RailCrossingProp,
};

useGLTF.preload(ENV_MODELS.bench);
useGLTF.preload(ENV_MODELS.trashcan);
useGLTF.preload(ENV_MODELS.tree);
useGLTF.preload(ENV_MODELS.treeLarge);
useGLTF.preload(ENV_MODELS.streetLantern);
useGLTF.preload(ENV_MODELS.railroadStraight);
useGLTF.preload(ENV_MODELS.railCrossing);

/**
 * Render one decoration at a grid cell, lifted to the cell's surface Y.
 *
 * @param {object} props
 * @param {{ map: any[][], origin: [number, number, number] }} props.world
 * @param {{ kind: string, gx: number, gz: number, rotation?: number, scale?: number, offset?: [number, number, number] }} props.deco
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
  const offset = deco.offset ?? [0, 0, 0];

  return (
    <group position={position} rotation={[0, deco.rotation ?? 0, 0]} scale={deco.scale ?? 1}>
      <group position={offset}>
        <Component />
      </group>
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
