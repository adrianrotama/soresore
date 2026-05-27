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

function BushLargeProp() {
  return <EnvironmentModel url={ENV_MODELS.bushLarge} />;
}

function BushProp() {
  return <EnvironmentModel url={ENV_MODELS.bush} />;
}

function CobbleStoneProp() {
  return <EnvironmentModel url={ENV_MODELS.cobbleStone} />;
}

function CobbleStoneLargeProp() {
  return <EnvironmentModel url={ENV_MODELS.cobbleStoneLarge} />;
}

function FlowerAProp() {
  return <EnvironmentModel url={ENV_MODELS.flowerA} />;
}

function FlowerBProp() {
  return <EnvironmentModel url={ENV_MODELS.flowerB} />;
}

function GrassAProp() {
  return <EnvironmentModel url={ENV_MODELS.grassA} />;
}

function GrassBProp() {
  return <EnvironmentModel url={ENV_MODELS.grassB} />;
}

function HedgeStraightProp() {
  return <EnvironmentModel url={ENV_MODELS.hedgeStraight} />;
}

function HedgeStraightLongProp() {
  return <EnvironmentModel url={ENV_MODELS.hedgeStraightLong} />;
}

function HedgeCornerProp() {
  return <EnvironmentModel url={ENV_MODELS.hedgeCorner} />;
}

function VendingMachineProp() {
  return <EnvironmentModel url={ENV_MODELS.vendingMachine} />;
}

function RailingProp() {
  return <EnvironmentModel url={ENV_MODELS.railing} />;
}

/**
 * Flat painted overlay sitting just above the tile surface.
 * Used for crosswalk stripes, tactile paving, lane markings — anything that's
 * "drawn on" the ground without needing a GLB.
 */
function FlatStripProp({ width, depth, color, height = 0.02 }) {
  return (
    <mesh position={[0, height / 2 + 0.01, 0]} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

function TactilePavingProp() {
  return <FlatStripProp width={2.0} depth={0.35} color="#e8c44a" />;
}

function CrosswalkStripeProp() {
  return <FlatStripProp width={2.0} depth={0.4} color="#f0ece4" />;
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
  bushLarge: BushLargeProp,
  bush: BushProp,
  cobbleStone: CobbleStoneProp,
  cobbleStoneLarge: CobbleStoneLargeProp,
  flowerA: FlowerAProp,
  flowerB: FlowerBProp,
  grassA: GrassAProp,
  grassB: GrassBProp,
  hedgeStraight: HedgeStraightProp,
  hedgeStraightLong: HedgeStraightLongProp,
  hedgeCorner: HedgeCornerProp,
  vendingMachine: VendingMachineProp,
  railing: RailingProp,
  tactilePaving: TactilePavingProp,
  crosswalkStripe: CrosswalkStripeProp,
};

useGLTF.preload(ENV_MODELS.bench);
useGLTF.preload(ENV_MODELS.trashcan);
useGLTF.preload(ENV_MODELS.tree);
useGLTF.preload(ENV_MODELS.treeLarge);
useGLTF.preload(ENV_MODELS.streetLantern);
useGLTF.preload(ENV_MODELS.railroadStraight);
useGLTF.preload(ENV_MODELS.railCrossing);
useGLTF.preload(ENV_MODELS.bushLarge);
useGLTF.preload(ENV_MODELS.bush);
useGLTF.preload(ENV_MODELS.cobbleStone);
useGLTF.preload(ENV_MODELS.cobbleStoneLarge);
useGLTF.preload(ENV_MODELS.flowerA);
useGLTF.preload(ENV_MODELS.flowerB);
useGLTF.preload(ENV_MODELS.grassA);
useGLTF.preload(ENV_MODELS.grassB);
useGLTF.preload(ENV_MODELS.hedgeStraight);
useGLTF.preload(ENV_MODELS.hedgeCorner);
useGLTF.preload(ENV_MODELS.hedgeStraightLong);
useGLTF.preload(ENV_MODELS.vendingMachine);
useGLTF.preload(ENV_MODELS.railing);

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
