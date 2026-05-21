"use client";

import { useRef, useMemo, useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ENV_MODELS } from "@/lib/environmentModels";
import {
  STATION_HUT_SCALE,
  STATION_HUT_ROTATION,
  stationHutWorldPosition,
} from "@/lib/stationLayout";

const DOOR_OPEN_DIST = 2.8;
const DOOR_CLOSE_DIST = 4.2;
const DOOR_SWING_SPEED = 4;
const DOOR_PIVOT_NAME = "Door_Pivot";
/** Match Blender Door_Pivot local Z (e.g. 50°). Flip sign if direction is reversed. */
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(-150);

/** Door proximity sample point — GLB local space, hut front. */
const FRONT_TRIGGER_LOCAL = new THREE.Vector3(0, 0.5, 2.2);

function enableShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

/**
 * One hut clone: static meshes + animated Door_Pivot sibling in the same graph
 * so ground-snap and hinge position stay aligned (no floating door).
 */
function prepareHutScene(scene) {
  const hut = scene.clone(true);
  enableShadows(hut);

  const embedded = hut.getObjectByName(DOOR_PIVOT_NAME);
  let doorPivot = null;

  if (embedded?.parent) {
    doorPivot = embedded.clone(true);
    doorPivot.name = DOOR_PIVOT_NAME;
    embedded.parent.add(doorPivot);
    embedded.visible = false;
    enableShadows(doorPivot);
  }

  return { hut, doorPivot };
}

/**
 * station-hut.glb — hut + platform mesh (not the whole rail slice; see StationRailProps).
 * Door_Pivot Empty (panel + handle) swings on proximity; hinge from Blender export.
 */
export default function StationHut({
  positionRef,
  start,
  position = stationHutWorldPosition(start),
  rotation = STATION_HUT_ROTATION,
  scale = STATION_HUT_SCALE,
}) {
  const groupRef = useRef();
  const doorAssemblyRef = useRef(null);
  const doorOpenRef = useRef(false);
  const doorAngleRef = useRef(0);
  const triggerWorld = useRef(new THREE.Vector3());

  const { scene } = useGLTF(ENV_MODELS.stationHut);

  const { hut: staticScene, doorPivot } = useMemo(
    () => prepareHutScene(scene),
    [scene]
  );

  useLayoutEffect(() => {
    doorAssemblyRef.current = doorPivot;

    const box = new THREE.Box3().setFromObject(staticScene);
    if (box.min.y !== 0) {
      staticScene.position.y -= box.min.y;
    }
  }, [staticScene, doorPivot]);

  useFrame((_, delta) => {
    const door = doorAssemblyRef.current;
    if (door) {
      const target = doorOpenRef.current ? DOOR_OPEN_ANGLE : 0;
      doorAngleRef.current = THREE.MathUtils.lerp(
        doorAngleRef.current,
        target,
        delta * DOOR_SWING_SPEED
      );
      // Only hinge rotation — do not change position (hinge must live on Door_Pivot in Blender).
      door.rotation.y = doorAngleRef.current;
    }

    if (!positionRef?.current || !groupRef.current) return;

    triggerWorld.current.copy(FRONT_TRIGGER_LOCAL);
    groupRef.current.localToWorld(triggerWorld.current);

    const { x, y, z } = positionRef.current;
    const dx = x - triggerWorld.current.x;
    const dz = z - triggerWorld.current.z;
    const dist = Math.hypot(dx, dz);

    if (dist < DOOR_OPEN_DIST) {
      doorOpenRef.current = true;
    } else if (dist > DOOR_CLOSE_DIST) {
      doorOpenRef.current = false;
    }
  });

  const scaleProp =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group
      ref={groupRef}
      name="station-hut"
      position={position}
      rotation={rotation}
      scale={scaleProp}
    >
      <primitive object={staticScene} />
    </group>
  );
}

useGLTF.preload(ENV_MODELS.stationHut);
