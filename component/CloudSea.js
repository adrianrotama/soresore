"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { getCloudTexture } from "@/lib/skyTextures";
import { WORLD_CENTER } from "@/lib/mapBounds";

/**
 * A soft mist layer beneath the floating diorama — looking over any edge shows
 * a sea of clouds instead of void. Flat horizontal billboards laid around the
 * clod, drifting slowly. Cheap and toon-friendly, same recipe as Clouds.js.
 */
const CLOUD_COLOR = "#ffe6cf";
const SEA_Y = -15; // above the clod bottom (~ -21) so the mist wraps around it
const DRIFT_SPEED = 0.05; // m/s — slower than the upper clouds
const SPREAD = 130; // horizontal radius around the world center
const WRAP_RANGE = SPREAD; // drift this far before wrapping back

/** Deterministic pseudo-random so the field is stable across renders. */
function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PUFF_COUNT = 26;

const CLOUD_PUFFS = Array.from({ length: PUFF_COUNT }, (_, i) => {
  const angle = rand(i + 1) * Math.PI * 2;
  const dist = 40 + rand(i + 7) * SPREAD;
  return {
    x: Math.cos(angle) * dist,
    y: SEA_Y + (rand(i + 3) - 0.5) * 6,
    z: Math.sin(angle) * dist,
    scale: 34 + rand(i + 5) * 46,
    opacity: 0.3 + rand(i + 11) * 0.28,
  };
});

function CloudSeaPuff({ x, y, z, scale, opacity, texture }) {
  const meshRef = useRef(null);
  const baseX = useRef(x);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let next = mesh.position.x + DRIFT_SPEED * delta;
    if (next > baseX.current + WRAP_RANGE) next -= WRAP_RANGE * 2;
    mesh.position.x = next;
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[scale, scale * 0.8, 1]}
      renderOrder={-1}
    >
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
  );
}

export default function CloudSea() {
  const texture = useMemo(() => getCloudTexture(), []);

  return (
    <group position={[WORLD_CENTER.x, 0, WORLD_CENTER.z]}>
      {CLOUD_PUFFS.map((puff, i) => (
        <CloudSeaPuff key={i} texture={texture} {...puff} />
      ))}
    </group>
  );
}
