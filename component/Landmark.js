"use client";

import StationRailProps from "@/component/StationRailProps";
import { STATION_START } from "@/lib/stationLayout";

/**
 * One landmark = a hand-placed, non-grid object (station depot, konbini, river).
 *
 * Differs from Decoration: uses world-space placement instead of (gx, gz).
 * Each kind component receives the landmark data + positionRef (for proximity
 * logic like hut doors).
 *
 * Add new kinds here:
 *   { kind: "konbini", position: [x, y, z] }
 *   { kind: "river_curve", position: [...], rotation: [...] }
 */

function DepotLandmark({ positionRef }) {
  return (
    <StationRailProps start={STATION_START} positionRef={positionRef} />
  );
}

const LANDMARK_COMPONENTS = {
  depot: DepotLandmark,
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
