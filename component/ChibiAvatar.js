"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  Box3,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CHIBI_BASE_MODEL } from "@/lib/avatarModels";
import {
  DEFAULT_APPEARANCE,
  HAIR_PARTS,
  OUTFIT_PARTS,
  resolveFacePart,
  resolveHairColor,
  resolveHairPart,
  resolveOutfitColor,
  resolveOutfitPart,
} from "@/lib/avatarParts";
import { createFaceCanvasTexture } from "@/lib/faceCanvasTexture";

useGLTF.preload(CHIBI_BASE_MODEL.url);
for (const part of Object.values(HAIR_PARTS)) {
  useGLTF.preload(part.url);
}
for (const part of Object.values(OUTFIT_PARTS)) {
  useGLTF.preload(part.url);
}

const _headPos = new Vector3();
const _headQuat = new Quaternion();
const _offset = new Vector3();
const _worldPos = new Vector3();
const _rigQuat = new Quaternion();
const _invRigQuat = new Quaternion();
const _faceQuat = new Quaternion();

function findClipName(clips, suffix) {
  const lower = suffix.toLowerCase();
  return clips.find(
    (clip) =>
      clip.name.toLowerCase() === lower ||
      clip.name.toLowerCase().endsWith(lower) ||
      clip.name.toLowerCase().includes(`|${lower}`)
  )?.name;
}

function applyToonMaterial(source, { tint = "#ffffff" } = {}) {
  const toon = new MeshToonMaterial({ color: tint });
  if (source?.map) toon.map = source.map;
  return toon;
}

function convertMeshToToon(mesh, tint) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const converted = sources.map((src) => applyToonMaterial(src, { tint }));
  mesh.material = converted.length === 1 ? converted[0] : converted;
}

function buildBodyModel(scene, config) {
  const model = cloneSkinned(scene);

  model.traverse((child) => {
    if (!child.isMesh) return;
    if (config.toon) convertMeshToToon(child, config.toonTint ?? "#ffffff");
  });

  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const footY = Number.isFinite(box.min.y) ? -box.min.y : 0;
  return { model, footY };
}

function clonePartMesh(partScene, meshName, tint) {
  const source = partScene.getObjectByName(meshName);
  if (!source?.isMesh) return null;

  const mesh = source.clone();
  convertMeshToToon(mesh, tint);
  return mesh;
}

function cloneSkinnedPartMesh(partScene, meshName, tint) {
  const source = partScene.getObjectByName(meshName);
  if (!source?.isSkinnedMesh) return null;

  const mesh = cloneSkinned(source);
  convertMeshToToon(mesh, tint);
  return mesh;
}

function findBodySkinnedMesh(rig) {
  let body = null;
  let vertCount = 0;
  rig.traverse((child) => {
    if (!child.isSkinnedMesh) return;
    const count = child.geometry?.attributes?.position?.count ?? 0;
    if (count > vertCount) {
      vertCount = count;
      body = child;
    }
  });
  return body;
}

function bindSkinnedOutfitToRig(rig, outfit, bodyMesh) {
  outfit.skeleton = bodyMesh.skeleton;
  outfit.bindMatrix.copy(bodyMesh.bindMatrix);
  outfit.bind(outfit.skeleton, outfit.bindMatrix);
  rig.add(outfit);
}

/** Rigid part GLBs bake world placement into mesh vertices — attach() keeps that pose. */
function attachToBonePreservingWorld(model, child, boneName) {
  const bone = model.getObjectByName(boneName);
  if (!bone) return false;

  model.add(child);
  model.updateMatrixWorld(true);
  bone.attach(child);
  return true;
}

/** Place face on model root; follow head each frame (meters, head-local axes). */
function syncFaceToHead(rig, face, headBoneName, part) {
  const head = rig.getObjectByName(headBoneName);
  if (!head) return;

  rig.updateMatrixWorld(true);
  head.getWorldPosition(_headPos);
  head.getWorldQuaternion(_headQuat);

  const [ox = 0, oy = 0, oz = 0] = part.offset ?? [];
  const [rx = 0, ry = 0, rz = 0] = part.rotation ?? [];
  _offset.set(ox, oy, oz).applyQuaternion(_headQuat);
  _worldPos.copy(_headPos).add(_offset);

  rig.worldToLocal(_worldPos);
  face.position.copy(_worldPos);

  rig.getWorldQuaternion(_rigQuat);
  _invRigQuat.copy(_rigQuat).invert();
  _faceQuat.copy(_headQuat).premultiply(_invRigQuat);
  face.quaternion.copy(_faceQuat);
  face.rotation.x += rx;
  face.rotation.y += ry;
  face.rotation.z += rz;
}

function addPartOffsetMeters(child, part, bone) {
  const boneScale = bone.getWorldScale(new Vector3()).x || 1;
  const [ox = 0, oy = 0, oz = 0] = part.offset ?? [];
  const [rx = 0, ry = 0, rz = 0] = part.rotation ?? [];
  if (ox || oy || oz) {
    child.position.add(new Vector3(ox / boneScale, oy / boneScale, oz / boneScale));
  }
  if (rx || ry || rz) child.rotation.set(rx, ry, rz);
}

function buildFaceMesh(texture, facePart) {
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    side: DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new Mesh(
    new PlaneGeometry(facePart.width, facePart.height),
    material
  );
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  return mesh;
}

function ChibiAvatarInner({ moving01Ref, appearance = DEFAULT_APPEARANCE }) {
  const config = CHIBI_BASE_MODEL;
  const rigRef = useRef();
  const animStarted = useRef(false);
  const hairKey = appearance?.hair ?? DEFAULT_APPEARANCE.hair;
  const hairColorKey = appearance?.hairColor ?? DEFAULT_APPEARANCE.hairColor;
  const faceKey = appearance?.face ?? DEFAULT_APPEARANCE.face;
  const outfitKey = appearance?.outfit ?? DEFAULT_APPEARANCE.outfit;
  const outfitColorKey = appearance?.outfitColor ?? DEFAULT_APPEARANCE.outfitColor;
  const hairPart = resolveHairPart(hairKey);
  const facePart = resolveFacePart(faceKey);
  const outfitPart = resolveOutfitPart(outfitKey);
  const hairColor = resolveHairColor(hairColorKey);
  const outfitColor = resolveOutfitColor(outfitColorKey);

  const { scene, animations } = useGLTF(config.url);
  const { scene: hairScene } = useGLTF(hairPart.url);
  const { scene: outfitScene } = useGLTF(outfitPart.url);
  const faceTexture = useMemo(
    () => createFaceCanvasTexture(facePart.variant ?? faceKey),
    [facePart.variant, faceKey]
  );
  const faceRef = useRef(null);

  const { model, footY } = useMemo(
    () => buildBodyModel(scene, config),
    [scene, config]
  );

  const { actions } = useAnimations(animations, rigRef);

  const idleName = useMemo(
    () => findClipName(animations, config.idleClip),
    [animations, config.idleClip]
  );
  const walkName = useMemo(
    () => findClipName(animations, config.walkClip),
    [animations, config.walkClip]
  );

  const footLift = footY + (config.footYOffset ?? 0);

  useEffect(() => {
    animStarted.current = false;
  }, [hairKey, hairColorKey, faceKey, outfitKey, outfitColorKey]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return undefined;

    const hairSrc = hairScene.getObjectByName(hairPart.meshName);
    const hair = clonePartMesh(
      hairScene,
      hairPart.meshName,
      hairColor ?? config.toonTint ?? "#ffffff"
    );
    if (!hair || !hairSrc) return undefined;

    hair.position.copy(hairSrc.position);
    hair.quaternion.copy(hairSrc.quaternion);
    hair.scale.copy(hairSrc.scale);

    const attached = attachToBonePreservingWorld(rig, hair, config.headBoneName);
    if (!attached) {
      hair.geometry?.dispose?.();
      return undefined;
    }

    const head = rig.getObjectByName(config.headBoneName);
    if (head) addPartOffsetMeters(hair, hairPart, head);

    return () => {
      hair.parent?.remove(hair);
      hair.geometry?.dispose?.();
      const mats = Array.isArray(hair.material) ? hair.material : [hair.material];
      mats.forEach((m) => m?.dispose?.());
    };
  }, [model, hairScene, hairPart, hairColor, config]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return undefined;

    const outfitSrc = outfitScene.getObjectByName(outfitPart.meshName);
    if (!outfitSrc?.isMesh) return undefined;

    const tint = outfitColor ?? "#ffffff";
    let outfit;

    if (outfitSrc.isSkinnedMesh) {
      const bodyMesh = findBodySkinnedMesh(rig);
      if (!bodyMesh) return undefined;

      outfit = cloneSkinnedPartMesh(outfitScene, outfitPart.meshName, tint);
      if (!outfit) return undefined;

      outfit.position.copy(outfitSrc.position);
      outfit.quaternion.copy(outfitSrc.quaternion);
      outfit.scale.copy(outfitSrc.scale);
      bindSkinnedOutfitToRig(rig, outfit, bodyMesh);
    } else {
      outfit = clonePartMesh(outfitScene, outfitPart.meshName, tint);
      if (!outfit) return undefined;

      outfit.position.copy(outfitSrc.position);
      outfit.quaternion.copy(outfitSrc.quaternion);
      outfit.scale.copy(outfitSrc.scale);

      const boneName = outfitPart.boneName ?? "mixamorigSpine2";
      const attached = attachToBonePreservingWorld(rig, outfit, boneName);
      if (!attached) {
        outfit.geometry?.dispose?.();
        return undefined;
      }

      const bone = rig.getObjectByName(boneName);
      if (bone) addPartOffsetMeters(outfit, outfitPart, bone);
    }

    return () => {
      outfit.parent?.remove(outfit);
      outfit.geometry?.dispose?.();
      const mats = Array.isArray(outfit.material) ? outfit.material : [outfit.material];
      mats.forEach((m) => m?.dispose?.());
    };
  }, [model, outfitScene, outfitPart, outfitColor]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || !faceTexture) return undefined;

    const face = buildFaceMesh(faceTexture, facePart);
    rig.add(face);
    faceRef.current = face;
    syncFaceToHead(rig, face, config.headBoneName, facePart);

    return () => {
      faceRef.current = null;
      rig.remove(face);
      face.geometry?.dispose?.();
      face.material?.map?.dispose?.();
      face.material?.dispose?.();
      faceTexture.dispose?.();
    };
  }, [model, faceTexture, facePart, config]);

  useFrame(() => {
    const rig = rigRef.current;
    const face = faceRef.current;
    if (rig && face) {
      syncFaceToHead(rig, face, config.headBoneName, facePart);
    }

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
 * Chibi player — rigged body + hair parented to head bone. Feet at local y = 0.
 */
export default function ChibiAvatar({ moving01Ref, appearance }) {
  const hairKey = appearance?.hair ?? DEFAULT_APPEARANCE.hair;
  const hairColorKey = appearance?.hairColor ?? DEFAULT_APPEARANCE.hairColor;
  const faceKey = appearance?.face ?? DEFAULT_APPEARANCE.face;
  const outfitKey = appearance?.outfit ?? DEFAULT_APPEARANCE.outfit;
  const outfitColorKey = appearance?.outfitColor ?? DEFAULT_APPEARANCE.outfitColor;
  return (
    <Suspense fallback={null}>
      <ChibiAvatarInner
        key={`${hairKey}-${hairColorKey}-${faceKey}-${outfitKey}-${outfitColorKey}`}
        moving01Ref={moving01Ref}
        appearance={appearance}
      />
    </Suspense>
  );
}
