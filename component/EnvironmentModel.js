"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3 } from "three";

/** Clone, shadow flags, and foot-snap before first paint (avoids useLayoutEffect drop). */
function prepareEnvironmentModel(scene) {
  const model = scene.clone(true);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  const box = new Box3().setFromObject(model);
  model.position.y -= box.min.y;
  return model;
}

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
  const { scene } = useGLTF(url);

  const model = useMemo(() => prepareEnvironmentModel(scene), [scene]);

  const scaleProp =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={scaleProp}>
      <primitive object={model} />
    </group>
  );
}
