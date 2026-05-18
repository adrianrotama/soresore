"use client";

import styles from "./page.module.scss";
import Game from "@/component/Game";

export default function Home() {
  return (
    <div className={styles.canvasContainer}>
      <Game />
      {/* <Canvas>
        <ambientLight intensity={0.4} />
        <directionalLight color="yellow" position={[0, 1, 5]} />
        <mesh>
          <sphereGeometry args={[3, 22]}/>
          <meshStandardMaterial color="red" />
        </mesh>
      </Canvas> */}
    </div>
  );
}
