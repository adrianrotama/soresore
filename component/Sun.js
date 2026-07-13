"use client";

import { useMemo } from "react";
import { Billboard } from "@react-three/drei";
import { AdditiveBlending, DoubleSide } from "three";
import { getSunGlowTexture } from "@/lib/skyTextures";
import { sunVisualPosition } from "@/lib/sunConfig";

const CORE_COLOR = "#fff6e2";
const HALO_COLOR = "#ffb37a";

/**
 * Low-horizon sun: soft additive halo + small bright core.
 * `toneMapped={false}` so it stays warm/bright regardless of scene tone mapping.
 */
export default function Sun() {
  const texture = useMemo(() => getSunGlowTexture(), []);
  const position = useMemo(() => sunVisualPosition(), []);

  return (
    <Billboard position={position}>
      <mesh scale={30} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          color={HALO_COLOR}
          transparent
          opacity={0.8}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={DoubleSide}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]} scale={5.5} renderOrder={-1}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color={CORE_COLOR}
          transparent
          opacity={0.95}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </Billboard>
  );
}
