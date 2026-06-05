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

      {/* <ambientLight color="#fcb57f" intensity={0.1} /> */}
      <ambientLight color="#ffd4a0" intensity={0.7} />


      <directionalLight
        position={[-8, 6, -5]}
        intensity={0.5}
        color="#a8c4e0"   // cool blue-gray sky bounce
      />

      {/* <hemisphereLight
        skyColor="#fcb57f"
        groundColor="#51A06B"
        intensity={0.2}
      /> */}


      <directionalLight
        position={[14, 20, 10]}
        intensity={0.8}
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


    </>
  );
}
