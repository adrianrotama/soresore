"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS, ENV_MODEL_URLS } from "@/lib/environmentModels";
import StationHut from "@/component/StationHut";
import {
  RAIL_COUNT,
  RAIL_SCALE,
  TRAIN_SCALE,
  CROSSING_SCALE,
  SEGMENT_LENGTH,
  TRAIN_OFFSET,
  TRAIN_CAR_SPACING,
} from "@/lib/stationLayout";

for (const url of ENV_MODEL_URLS) {
  useGLTF.preload(url);
}

// Kenney rail/train tiles: rotate 90° so tile length runs world +X (see stationLayout STATION_START).
const RAIL_ROTATION = [0, Math.PI / 2, 0];
const TRAIN_ROTATION = [0, Math.PI / 2, 0];
const CROSSING_ROTATION = [0, 0, 0];

/** Segment index 0 at start; higher indices extend toward +X (right). */
function railPosition(start, index) {
  return [start[0] + index * SEGMENT_LENGTH, start[1], start[2]];
}

/** World position for one car: head → car → tail along +X. */
function trainCarPosition(start, carIndex) {
  const [x, y, z] = [
    start[0] + TRAIN_OFFSET,
    start[1],
    start[2],
  ];
  return [x + carIndex * TRAIN_CAR_SPACING, y, z];
}

const TRAIN_PARTS = [
  { urlKey: "trainHead", carIndex: 0 },
  { urlKey: "trainCar", carIndex: -1 },
  { urlKey: "trainTail", carIndex: -2 },
];

function TrainConsist({ start }) {
  return (
    <group name="train-consist">
      {TRAIN_PARTS.map(({ urlKey, carIndex }) => (
        <EnvironmentModel
          key={urlKey}
          url={ENV_MODELS[urlKey]}
          position={trainCarPosition(start, carIndex)}
          rotation={TRAIN_ROTATION}
          scale={TRAIN_SCALE}
        />
      ))}
    </group>
  );
}

function crossingPosition(start) {
  return [
    start[0] + 20,
    start[1],
    start[2] + 4.5,
  ];
}

function RailStraight({ start, index }) {
  return (
    <EnvironmentModel
      url={ENV_MODELS.railStraight}
      position={railPosition(start, index)}
      rotation={RAIL_ROTATION}
      scale={RAIL_SCALE}
    />
  );
}

function StationRailPropsInner({ start = [-10, 0, 0], positionRef }) {
  return (
    <group name="station-rail-props">
      <StationHut start={start} positionRef={positionRef} />

      {Array.from({ length: RAIL_COUNT }, (_, i) => (
        <RailStraight key={i} start={start} index={i} />
      ))}

      <TrainConsist start={start} />

      <EnvironmentModel
        url={ENV_MODELS.railCrossingLong}
        position={crossingPosition(start)}
        rotation={CROSSING_ROTATION}
        scale={CROSSING_SCALE}
      />
    </group>
  );
}

/**
 * Rails along +X from `start`, Kenney train consist, crossing, and StationHut (station-hut.glb).
 * Hut position / spawn / scale: lib/stationLayout.js (stationHutWorldPosition, etc.).
 *
 * @param {[number, number, number]} start — STATION_START: first rail tile [x, y, z]
 * @param {{ current: { x: number, y: number, z: number } }} positionRef — local player (door proximity)
 */
export default function StationRailProps({ start = [-15, 0, 0], positionRef }) {
  return (
    <Suspense fallback={null}>
      <StationRailPropsInner start={start} positionRef={positionRef} />
    </Suspense>
  );
}
