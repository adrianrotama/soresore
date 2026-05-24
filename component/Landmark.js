"use client";

import TrainLandmark from "@/component/StationRailProps";
import { DEFAULT_TRAIN_ROUTE } from "@/lib/trainRoute";

/**
 * One landmark = a hand-placed, non-grid object (train, konbini, river).
 *
 * Train example:
 *   {
 *     kind: "train",
 *     start: [x, y, z],
 *     end: [x, y, z],
 *     speed: 8,
 *     respawnMs: 3000,
 *   }
 */

function TrainLandmarkEntry({ landmark }) {
  const route = {
    start: landmark.start ?? DEFAULT_TRAIN_ROUTE.start,
    end: landmark.end ?? DEFAULT_TRAIN_ROUTE.end,
    speed: landmark.speed,
    respawnMs: landmark.respawnMs,
  };

  return <TrainLandmark route={route} />;
}

const LANDMARK_COMPONENTS = {
  train: TrainLandmarkEntry,
};

export default function Landmark({ landmark, positionRef }) {
  const Component = LANDMARK_COMPONENTS[landmark.kind];
  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Landmark] unknown kind: ${landmark.kind}`);
    }
    return null;
  }
  return <Component landmark={landmark} positionRef={positionRef} />;
}
