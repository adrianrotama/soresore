"use client";

import { Html } from "@react-three/drei";
import styles from "@/component/NameTag.module.scss";

const NAME_Y = 2.05;

export default function NameTag({ name }) {
  if (!name) return null;

  return (
    <Html
      position={[0, NAME_Y, 0]}
      center
      distanceFactor={10}
      style={{ pointerEvents: "none", userSelect: "none" }}
      zIndexRange={[34, 0]}
    >
      <div className={styles.tag}>{name}</div>
    </Html>
  );
}
