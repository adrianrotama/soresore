"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { DoubleSide } from "three";
import { getCloudTexture } from "@/lib/skyTextures";

/** Flat low-poly-friendly billboards — cheap, matches the toon/cozy sky. */
const CLOUD_COLOR = "#ffe6cf";
const DRIFT_SPEED = 0.12; // m/s
const WRAP_RANGE = 90; // drift +/- this far from spawn x before wrapping back

const CLOUD_PUFFS = [
  { x: -80, y: 32, z: -70, scale: 28, opacity: 0.58 },
  { x: 40, y: 38, z: -95, scale: 36, opacity: 0.5 },
  { x: -30, y: 44, z: 65, scale: 30, opacity: 0.55 },
  { x: 95, y: 28, z: 35, scale: 22, opacity: 0.45 },
  { x: 8, y: 48, z: -35, scale: 40, opacity: 0.4 },
  { x: -115, y: 36, z: 15, scale: 26, opacity: 0.5 },
  { x: 60, y: 30, z: -40, scale: 24, opacity: 0.48 },
  { x: -50, y: 40, z: 30, scale: 32, opacity: 0.42 },
  { x: 120, y: 44, z: -20, scale: 30, opacity: 0.4 },
  { x: -10, y: 26, z: -100, scale: 20, opacity: 0.55 },
  { x: 20, y: 52, z: 90, scale: 38, opacity: 0.35 },
  { x: -140, y: 30, z: -30, scale: 26, opacity: 0.5 },
  { x: 75, y: 46, z: 60, scale: 34, opacity: 0.38 },
  { x: -60, y: 22, z: -50, scale: 18, opacity: 0.5 },
];

function CloudPuff({ x, y, z, scale, opacity, texture }) {
  const groupRef = useRef(null);
  const baseX = useRef(x);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    let next = group.position.x + DRIFT_SPEED * delta;
    if (next > baseX.current + WRAP_RANGE) next -= WRAP_RANGE * 2;
    group.position.x = next;
  });

  return (
    <Billboard ref={groupRef} position={[x, y, z]}>
      <mesh scale={[scale, scale * 0.6, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          color={CLOUD_COLOR}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </Billboard>
  );
}

export default function Clouds() {
  const texture = useMemo(() => getCloudTexture(), []);

  return (
    <group>
      {CLOUD_PUFFS.map((puff, i) => (
        <CloudPuff key={i} texture={texture} {...puff} />
      ))}
    </group>
  );
}
