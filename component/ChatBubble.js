"use client";

import { Html } from "@react-three/drei";
import styles from "@/component/ChatBubble.module.scss";

/** Vertical offset above the avatar root — raise to move bubble higher. */
export const CHAT_BUBBLE_Y = 2.5;

export default function ChatBubble({ text }) {
  if (!text) return null;

  return (
    <Html
      position={[0, CHAT_BUBBLE_Y, 0]}
      center
      distanceFactor={10}
      style={{
        pointerEvents: "none",
        userSelect: "none",
        // Prevent drei wrapper from collapsing width (causes 1 char per line).
        width: "max-content",
      }}
      zIndexRange={[40, 0]}
    >
      <div className={styles.bubble}>{text}</div>
    </Html>
  );
}
