"use client";

// Evening palette from AGENTS.md — orange sun, blue-gray atmosphere.
const FOG_COLOR = "#fcb57f";
const SUN_COLOR = "#fcb57f";
const GROUND_COLOR = "#51A06B";

const GROUND_SIZE = 100;
const FOG_NEAR = 16;
const FOG_FAR = 62;

export default function Environment() {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      <ambientLight color="#fcb57f" intensity={0.9} />

      {/* Low evening sun — warm key light + shadows */}
      <directionalLight
        position={[14, 20, 10]}
        intensity={1.15}
        color={SUN_COLOR}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial
          color={GROUND_COLOR}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </>
  );
}
