"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, MeshToonMaterial } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { PLAYER_CAT_MODELS } from "@/lib/playerModels";
import { paintQuaterniusVertexColors } from "@/lib/quaterniusRecolor";

for (const key of Object.keys(PLAYER_CAT_MODELS)) {
  useGLTF.preload(PLAYER_CAT_MODELS[key].url);
}

function findClipName(clips, suffix) {
  return clips.find((clip) => clip.name.endsWith(suffix) || clip.name.includes(`|${suffix}`))?.name;
}

function applyToonMaterial(source, { tint = "#ffffff", vertexColors = false } = {}) {
  const toon = new MeshToonMaterial({
    color: vertexColors ? "#ffffff" : tint,
    vertexColors,
  });
  if (source.map) {
    toon.map = source.map;
  }
  return toon;
}

function buildAvatarModel(scene, config, palette) {
  const model = config.animated ? cloneSkinned(scene) : scene.clone(true);
  const recolor = palette && config.paletteRecolor;

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    if (recolor) {
      child.geometry = paintQuaterniusVertexColors(child.geometry, palette);
    }
    if (config.toon) {
      const sources = Array.isArray(child.material) ? child.material : [child.material];
      const converted = sources.map((src) => {
        if (recolor) {
          return new MeshToonMaterial({ vertexColors: true, color: "#ffffff" });
        }
        return applyToonMaterial(src, { tint: config.toonTint ?? "#ffffff" });
      });
      child.material = converted.length === 1 ? converted[0] : converted;
    }
  });
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const footY = Number.isFinite(box.min.y) ? -box.min.y : 0;
  return { model, footY };
}

function PlayerAvatarInner({ modelKey, moving01Ref, guestPalette }) {
  const config = PLAYER_CAT_MODELS[modelKey] ?? PLAYER_CAT_MODELS.quaternius;
  const rigRef = useRef();
  const animStarted = useRef(false);
  const { scene, animations } = useGLTF(config.url);
  const paletteKey = guestPalette?.name ?? "";
  const { model, footY } = useMemo(
    () => buildAvatarModel(scene, config, guestPalette),
    [scene, config, guestPalette, paletteKey]
  );
  const { actions } = useAnimations(animations, rigRef);

  const idleName = useMemo(
    () => (config.animated ? findClipName(animations, "Idle") : null),
    [animations, config.animated]
  );
  const walkName = useMemo(
    () => (config.animated ? findClipName(animations, "Walk") : null),
    [animations, config.animated]
  );

  const footLift = footY + (config.footYOffset ?? 0);

  useEffect(() => {
    animStarted.current = false;
  }, [modelKey]);

  useFrame(() => {
    if (!config.animated) return;

    if (!animStarted.current && idleName && rigRef.current) {
      const idle = actions[idleName];
      if (idle) {
        idle.reset().fadeIn(0.2).play();
        animStarted.current = true;
      }
    }

    if (!walkName || !idleName) return;
    const moving01 = moving01Ref?.current ?? 0;
    const walk = actions[walkName];
    const idle = actions[idleName];
    if (!walk || !idle) return;

    const walking = moving01 > 0.15;
    if (walking) {
      if (!walk.isRunning()) {
        idle.fadeOut(0.15);
        walk.reset().fadeIn(0.15).play();
      }
      walk.timeScale = 0.6 + moving01 * 0.8;
    } else if (!idle.isRunning()) {
      walk.fadeOut(0.15);
      idle.reset().fadeIn(0.15).play();
    }
  });

  const scaleProp =
    typeof config.scale === "number"
      ? [config.scale, config.scale, config.scale]
      : config.scale;
  return (
    <group rotation={config.rotation} scale={scaleProp}>
      <group position={[0, footLift, 0]}>
        <primitive ref={rigRef} object={model} />
      </group>
    </group>
  );
}

/**
 * Guest cat GLB — feet snapped to local y = 0 for PLAYER_FOOT_OFFSET in LocalPlayer.
 */
export default function PlayerAvatar({ modelKey, moving01Ref, guestPalette }) {
  const paletteKey = guestPalette?.name ?? "none";
  return (
    <Suspense fallback={null}>
      <PlayerAvatarInner
        key={`${modelKey}-${paletteKey}`}
        modelKey={modelKey}
        moving01Ref={moving01Ref}
        guestPalette={guestPalette}
      />
    </Suspense>
  );
}
