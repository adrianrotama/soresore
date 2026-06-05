"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const TARGET_Y_OFFSET = 1;
/** Starting offset on first frame (similar to former FollowCamera). */
const INIT_HEIGHT = 6;
const INIT_DISTANCE_BEHIND = 10;

/**
 * Default camera — orbit pivot follows the player; drag to adjust view, scroll to zoom.
 * Camera pans with WASD so angle/zoom stay stable while walking.
 */
export default function PlayerOrbitCamera({ positionRef }) {
  const controlsRef = useRef();
  const lastPlayer = useRef(null);
  const didInit = useRef(false);
  const { camera } = useThree();

  useFrame(() => {
    if (!positionRef?.current) return;

    const { x, y, z } = positionRef.current;
    const controls = controlsRef.current;
    if (!controls) return;

    const targetY = y + TARGET_Y_OFFSET;

    if (!didInit.current) {
      camera.position.set(x, y + INIT_HEIGHT, z + INIT_DISTANCE_BEHIND);
      controls.target.set(x, targetY, z);
      controls.update();
      lastPlayer.current = { x, y, z };
      didInit.current = true;
      return;
    }

    if (lastPlayer.current) {
      const dx = x - lastPlayer.current.x;
      const dy = y - lastPlayer.current.y;
      const dz = z - lastPlayer.current.z;
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
    }

    controls.target.set(x, targetY, z);
    controls.update();

    lastPlayer.current = { x, y, z };
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onStart={() => {
        if (positionRef?.current) {
          const { x, y, z } = positionRef.current;
          lastPlayer.current = { x, y, z };
        }
      }}
    />
  );
}
