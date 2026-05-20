"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS, ENV_MODEL_URLS } from "@/lib/environmentModels";

for (const url of ENV_MODEL_URLS) {
  useGLTF.preload(url);
}

// Kenney straight tile spacing — tweak until segments meet cleanly.
const RAIL_COUNT = 8;

const RAIL_SCALE = 1.8;
const TRAIN_SCALE = 1.8;
const CROSSING_SCALE = 0.02;

const SEGMENT_LENGTH = RAIL_SCALE * 2;

// Fixed rotations (aligned with +X track in your scene).
const RAIL_ROTATION = [0, Math.PI / 2, 0];
const TRAIN_ROTATION = [0, Math.PI / 2, 0];
const CROSSING_ROTATION = [0, 0, 0];

const TRAIN_OFFSET = 2;
// Spacing between car origins along the track (+X); tune if gaps or overlap.
const TRAIN_CAR_SPACING = TRAIN_SCALE * 2.45;

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
    start[0] + (RAIL_COUNT * SEGMENT_LENGTH / 2) - 4,
    start[1],
    start[2] + 4,
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

function StationRailPropsInner({ start = [-10, 0, 0] }) {
  return (
    <group name="station-rail-props">
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
 * Straight track along +X: segment 0 at `start`, more segments to the right.
 * Train near the start; crossing past the last segment (right end).
 *
 * @param {[number, number, number]} start — world position [x, y, z] of the first rail tile
 */
export default function StationRailProps({ start = [-15, 0, 0] }) {
  return (
    <Suspense fallback={null}>
      <StationRailPropsInner start={start} />
    </Suspense>
  );
}
