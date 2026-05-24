"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS } from "@/lib/environmentModels";
import {
  TRAIN_SCALE,
  TRAIN_CAR_SPACING,
  TRAIN_CONSIST_LENGTH,
  normalizeTrainRoute,
  straightRouteLength,
  sampleStraightRoute,
  carRouteOpacity,
  trainExitLeadDistance,
} from "@/lib/trainRoute";

const BASE_ROTATION = [0, Math.PI / 2, 0];

const TRAIN_PARTS = [
  { urlKey: "trainHead", pathBack: 0, rotation: [0, -Math.PI / 2, 0] },
  { urlKey: "trainCar", pathBack: TRAIN_CAR_SPACING },
  {
    urlKey: "trainTail",
    pathBack: TRAIN_CAR_SPACING * 2,
    rotation: [0, Math.PI / 2 + Math.PI, 0],
  },
];

function setCarOpacity(car, opacity) {
  car.traverse((child) => {
    if (!child.isMesh) return;

    if (!child.userData.trainMaterialCloned) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => {
          const cloned = m.clone();
          cloned.transparent = true;
          return cloned;
        });
      } else {
        child.material = child.material.clone();
        child.material.transparent = true;
      }
      child.userData.trainMaterialCloned = true;
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((m) => {
        m.opacity = opacity;
      });
    } else {
      child.material.opacity = opacity;
    }
  });
}

function applyConsistPose(cars, start, end, leadDistance, routeLength) {
  TRAIN_PARTS.forEach((part, i) => {
    const car = cars[i];
    if (!car) return;

    const carDistance = leadDistance - part.pathBack;
    const { position, heading } = sampleStraightRoute(start, end, carDistance);
    car.position.set(position[0], position[1], position[2]);
    car.rotation.y = heading;

    const opacity = carRouteOpacity(carDistance, routeLength);
    setCarOpacity(car, opacity);
    car.visible = opacity > 0.01;
  });
}

/**
 * Straight run start → end; cars enter and exit one-by-one (snake-style).
 */
export default function TrainConsist({ route }) {
  const carRefs = useRef([]);
  const leadDistanceRef = useRef(-TRAIN_CONSIST_LENGTH);
  const waitMsRef = useRef(0);

  const { start, end, speed, respawnMs } = useMemo(
    () => normalizeTrainRoute(route),
    [route],
  );
  const routeLength = useMemo(
    () => straightRouteLength(start, end),
    [start, end],
  );

  useLayoutEffect(() => {
    leadDistanceRef.current = -TRAIN_CONSIST_LENGTH;
    applyConsistPose(carRefs.current, start, end, leadDistanceRef.current, routeLength);
  }, [start, end, routeLength]);

  const exitLead = useMemo(
    () => trainExitLeadDistance(routeLength),
    [routeLength],
  );

  useFrame((_, delta) => {
    if (waitMsRef.current > 0) {
      waitMsRef.current -= delta * 1000;
      carRefs.current.forEach((car) => {
        if (!car) return;
        setCarOpacity(car, 0);
        car.visible = false;
      });
      if (waitMsRef.current <= 0) {
        waitMsRef.current = 0;
        leadDistanceRef.current = -TRAIN_CONSIST_LENGTH;
        applyConsistPose(
          carRefs.current,
          start,
          end,
          leadDistanceRef.current,
          routeLength,
        );
      }
      return;
    }

    leadDistanceRef.current += delta * speed;

    if (leadDistanceRef.current >= exitLead) {
      leadDistanceRef.current = exitLead;
      waitMsRef.current = respawnMs;
    }

    applyConsistPose(
      carRefs.current,
      start,
      end,
      leadDistanceRef.current,
      routeLength,
    );
  });

  return (
    <group name="train-consist">
      {TRAIN_PARTS.map(({ urlKey, rotation }, i) => (
        <group
          key={urlKey}
          ref={(el) => {
            carRefs.current[i] = el;
          }}
        >
          <EnvironmentModel
            url={ENV_MODELS[urlKey]}
            position={[0, 0, 0]}
            rotation={rotation ?? BASE_ROTATION}
            scale={TRAIN_SCALE}
          />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(ENV_MODELS.trainHead);
useGLTF.preload(ENV_MODELS.trainCar);
useGLTF.preload(ENV_MODELS.trainTail);
