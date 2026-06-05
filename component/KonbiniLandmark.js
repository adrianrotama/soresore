"use client";

import { Suspense } from "react";
import { Center, Text3D, useFont, useGLTF } from "@react-three/drei";
import EnvironmentModel from "@/component/EnvironmentModel";
import { ENV_MODELS } from "@/lib/environmentModels";

useGLTF.preload(ENV_MODELS.japaneseStore);

/** Default 1 — GLB already exports at game size (~6 m). Override in testWorld only if needed. */
export const KONBINI_DEFAULT_SCALE = 1;

/** three.js typeface JSON (Text3D extrusion). */
const SIGN_FONT =
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json";

useFont.preload(SIGN_FONT);

const DEFAULT_SIGN = {
  text: "KONBINI",
  position: [0, 3.8, -1.65],
  /**
   * Separate axes (building-local space) — do NOT use one combined rotation triple;
   * Euler XYZ couples pitch + yaw and makes the text look rolled on the board.
   *
   * - tilt: pitch (X) — negative tips the top toward the ground / matches board slope
   * - yaw:  which way the sign faces (Y)
   * - roll: spin in the board plane (Z) — usually 0; tweak if text looks diagonal
   */
  tilt: 0.5,
  yaw: 0,
  roll: 0,
  fontSize: 0.35,
  color: "#3d2b1f",
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.008,
  bevelSize: 0.004,
};

function resolveSignAxes(sign) {
  return {
    tilt: sign.tilt ?? sign.rotation?.[0] ?? 0,
    yaw: sign.yaw ?? sign.rotation?.[1] ?? 0,
    roll: sign.roll ?? sign.rotation?.[2] ?? 0,
  };
}

function KonbiniBuilding({ scale }) {
  const scaleProp =
    typeof scale === "number" ? [scale, scale, scale] : scale;

  return (
    <group scale={scaleProp}>
      <EnvironmentModel url={ENV_MODELS.japaneseStore} />
    </group>
  );
}

function KonbiniSign({ sign }) {
  const { tilt, yaw, roll } = resolveSignAxes(sign);

  return (
    <group position={sign.position}>
      <group rotation={[0, yaw, 0]}>
        <group rotation={[tilt, 0, 0]}>
          <group rotation={[0, 0, roll]}>
            <Center>
              <Text3D
                font={SIGN_FONT}
                size={sign.fontSize}
                height={sign.depth}
                bevelEnabled={sign.bevelEnabled}
                bevelThickness={sign.bevelThickness}
                bevelSize={sign.bevelSize}
                bevelSegments={3}
                curveSegments={10}
              >
                {sign.text}
                <meshToonMaterial color={sign.color} />
              </Text3D>
            </Center>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * @param {{
 *   position: [number, number, number],
 *   rotation?: number,
 *   scale?: number,
 *   sign?: {
 *     text?: string,
 *     position?: [number, number, number],
 *     tilt?: number,
 *     yaw?: number,
 *     roll?: number,
 *     rotation?: [number, number, number],
 *     fontSize?: number,
 *     color?: string,
 *     depth?: number,
 *     bevelEnabled?: boolean,
 *     bevelThickness?: number,
 *     bevelSize?: number,
 *   },
 * }} landmark
 */
function KonbiniLandmarkInner({ landmark }) {
  const position = landmark.position ?? [0, 0, 0];
  const rotationY = landmark.rotation ?? 0;
  const scale = landmark.scale ?? KONBINI_DEFAULT_SCALE;
  const sign = { ...DEFAULT_SIGN, ...landmark.sign };

  return (
    <group
      name="konbini-landmark"
      position={position}
      rotation={[0, rotationY, 0]}
    >
      <Suspense fallback={null}>
        <KonbiniBuilding scale={scale} />
      </Suspense>
      {sign.text ? (
        <Suspense fallback={null}>
          <KonbiniSign sign={sign} />
        </Suspense>
      ) : null}
    </group>
  );
}

export default function KonbiniLandmark({ landmark }) {
  return <KonbiniLandmarkInner landmark={landmark} />;
}
