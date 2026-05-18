"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

const SPEED = 0.05;

function isMovingKey(key) {
  return (
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d" ||
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}

export default function LocalPlayer({ positionRef }) {
  const meshRef = useRef();
  const keys = useRef({});

  useEffect(() => {
    const down = (e) => {
      if (isMovingKey(e.key)) keys.current[e.key] = true;
    };
    const up = (e) => {
      if (isMovingKey(e.key)) keys.current[e.key] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(() => {
    const pos = positionRef.current;
    let { x, y, z } = pos;

    if (keys.current.w || keys.current.ArrowUp) z -= SPEED;
    if (keys.current.s || keys.current.ArrowDown) z += SPEED;
    if (keys.current.a || keys.current.ArrowLeft) x -= SPEED;
    if (keys.current.d || keys.current.ArrowRight) x += SPEED;

    pos.x = x;
    pos.y = y;
    pos.z = z;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
    }
  });

  const { x, y, z } = positionRef.current;

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}
