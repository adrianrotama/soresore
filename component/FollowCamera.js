"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Offset from player: above + behind (+Z; local player moves toward -Z with W).
const HEIGHT_ABOVE = 3;
const DISTANCE_BEHIND = 6;
// Higher = snappier follow (frame-rate independent via delta).
const POSITION_SMOOTH = 9;

export default function FollowCamera({ targetRef }) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { x, y, z } = targetRef.current;

    // Cozy default: stable follow camera (avoid oscillation for motion comfort).
    desiredPosition.current.set(x, y + HEIGHT_ABOVE, z + DISTANCE_BEHIND);

    const t = 1 - Math.exp(-POSITION_SMOOTH * delta);
    camera.position.lerp(desiredPosition.current, t);
    camera.lookAt(x, y, z);
  });

  return null;
}
