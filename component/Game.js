"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Player from "@/component/Player";
import LocalPlayer from "@/component/LocalPlayer";

const SYNC_MS = 5000;

export default function Game() {
  const playerId = useMemo(() => crypto.randomUUID(), []);
  const myPositionRef = useRef({ x: 0, y: 0.5, z: 0 });
  const [players, setPlayers] = useState({});

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from("players").select("id, x, y, z");
      if (!data) return;

      const map = {};
      for (const row of data) {
        map[row.id] = { x: row.x, y: row.y, z: row.z };
      }
      setPlayers(map);
    }

    loadPlayers();

    const channel = supabase
      .channel("players-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            setPlayers((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
            return;
          }

          const row = payload.new;
          setPlayers((prev) => ({
            ...prev,
            [row.id]: { x: row.x, y: row.y, z: row.z },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { x, y, z } = myPositionRef.current;
      await supabase.from("players").upsert({ id: playerId, x, y, z });
      console.log("Uploaded to Supabase");
    }, SYNC_MS);

    return () => clearInterval(interval);
  }, [playerId]);

  useEffect(() => {
    return () => {
      supabase.from("players").delete().eq("id", playerId);
    };
  }, [playerId]);

  const remotePlayers = Object.entries(players).filter(([id]) => id !== playerId);

  return (
    <Canvas camera={{ position: [2, 5, 10] }}>
      <ambientLight intensity={1} />

      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      <LocalPlayer positionRef={myPositionRef} />

      {remotePlayers.map(([id, pos]) => (
        <Player
          key={id}
          position={[pos.x, pos.y, pos.z]}
          isMe={false}
        />
      ))}

      <OrbitControls />
    </Canvas>
  );
}
