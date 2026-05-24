"use client";

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import TrainConsist from "@/component/TrainConsist";
import { ENV_MODEL_URLS } from "@/lib/environmentModels";

for (const url of ENV_MODEL_URLS) {
  useGLTF.preload(url);
}

/**
 * Train landmark — straight run between `start` and `end` world positions.
 *
 * @param {{ start: [number, number, number], end: [number, number, number], speed?: number, respawnMs?: number }} route
 */
function TrainLandmarkInner({ route }) {
  return (
    <group name="train-landmark">
      <TrainConsist route={route} />
    </group>
  );
}

export default function TrainLandmark({ route }) {
  return (
    <Suspense fallback={null}>
      <TrainLandmarkInner route={route} />
    </Suspense>
  );
}
