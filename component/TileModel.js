"use client";

import { useMemo, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  BufferAttribute,
  Color,
  MeshToonMaterial,
} from "three";
import { TILE_TOP_Y_RATIO } from "@/lib/tileModels";

function toToonMaterial(source) {
  return new MeshToonMaterial({
    color: source.color?.clone?.() ?? source.color ?? "#ffffff",
    map: source.map ?? null,
    transparent: source.transparent,
    opacity: source.opacity ?? 1,
  });
}

/**
 * Load a pedestal GLB once and recolor it per tile palette.
 *
 * Original colormap texture is discarded; we paint fresh vertex colors using a
 * Y-position threshold (top face = palette.top, sides = palette.side).
 * Geometry is cloned per instance so each cell can carry its own colors.
 *
 * @param {object} props
 * @param {string} props.url
 * @param {{ top: string, side: string }} props.palette
 * @param {[number, number, number]} [props.position=[0, 0, 0]]
 * @param {[number, number, number]} [props.rotation=[0, 0, 0]]
 * @param {number | [number, number, number]} [props.scale=1]
 * @param {boolean} [props.nativeColor=false] — keep GLB materials (no palette repaint)
 */
export default function TileModel({
  url,
  palette,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  nativeColor = false,
}) {
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    if (nativeColor) {
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(toToonMaterial);
        } else {
          child.material = toToonMaterial(child.material);
        }
      });
    } else {
      const topColor = new Color(palette.top);
      const sideColor = new Color(palette.side);

      let meshMaxY = -Infinity;
      let meshMinY = Infinity;
      model.traverse((child) => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > meshMaxY) meshMaxY = y;
          if (y < meshMinY) meshMinY = y;
        }
      });
      const span = meshMaxY - meshMinY || 1;
      const topThreshold = meshMinY + span * TILE_TOP_Y_RATIO;

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        child.geometry = child.geometry.clone();
        const pos = child.geometry.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const c = y >= topThreshold ? topColor : sideColor;
          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        }
        child.geometry.setAttribute("color", new BufferAttribute(colors, 3));

        child.material = new MeshToonMaterial({
          vertexColors: true,
        });
        child.material.needsUpdate = true;
      });
    }

    const box = new Box3().setFromObject(model);
    model.position.y -= box.min.y;
  }, [model, palette.top, palette.side, nativeColor]);

  const scaleProp =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scaleProp}
    >
      <primitive object={model} />
    </group>
  );
}
