"use client";

import { useMemo, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3 } from "three";

/**
 * Load one GLB, enable shadows, and sit its bottom on y = 0.
 * First 3D building block — reuse for konbini, benches, etc.
 */
export default function EnvironmentModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const box = new Box3().setFromObject(model);
    model.position.y -= box.min.y;
  }, [model]);

  const scaleProp =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scaleProp}>
      <primitive object={model} />
    </group>
  );
}
