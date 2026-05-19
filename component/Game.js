"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import RemotePlayer from "@/component/RemotePlayer";
import LocalPlayer from "@/component/LocalPlayer";
import FollowCamera from "@/component/FollowCamera";
import Environment from "@/component/Environment";

const SYNC_MS = 5000;
// Drop players who haven't heartbeated within this window (should be > SYNC_MS).
const STALE_MS = 15_000;
const PRUNE_MS = 2000;

function isPlayerStale(lastSeen) {
  if (!lastSeen) return true;
  return Date.now() - new Date(lastSeen).getTime() > STALE_MS;
}

function playerFromRow(row) {
  return {
    x: row.x,
    y: row.y,
    z: row.z,
    last_seen: row.last_seen,
  };
}

function pruneStalePlayers(players) {
  let changed = false;
  const next = { ...players };

  for (const [id, player] of Object.entries(next)) {
    if (isPlayerStale(player.last_seen)) {
      delete next[id];
      changed = true;
    }
  }

  return changed ? next : players;
}

export default function Game() {
  const playerId = useMemo(() => crypto.randomUUID(), []);
  const myPositionRef = useRef({ x: 0, y: 0.5, z: 0 });
  // Network-authoritative positions from Supabase (not rendered directly).
  const [players, setPlayers] = useState({});

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase
        .from("players")
        .select("id, x, y, z, last_seen");

      if (!data) return;

      const map = {};
      for (const row of data) {
        if (isPlayerStale(row.last_seen)) continue;
        map[row.id] = playerFromRow(row);
      }
      setPlayers(map);
    }

    loadPlayers();

    // Client-only label for this browser's realtime subscription (not created in the dashboard).
    const channel = supabase
      .channel("players-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          const row = payload.new;
          if (isPlayerStale(row.last_seen)) {
            setPlayers((prev) => {
              if (!prev[row.id]) return prev;
              const next = { ...prev };
              delete next[row.id];
              return next;
            });
            return;
          }

          setPlayers((prev) => ({
            ...prev,
            [row.id]: playerFromRow(row),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prune stale players every PRUNE_MS
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) => pruneStalePlayers(prev));
    }, PRUNE_MS);

    return () => clearInterval(interval);
  }, []);


  // Update player position to Supabase every SYNC_MS
  useEffect(() => {
    const interval = setInterval(async () => {
      const { x, y, z } = myPositionRef.current;
      await supabase.from("players").upsert({
        id: playerId,
        x,
        y,
        z,
        last_seen: new Date().toISOString(),
      });
    }, SYNC_MS);

    return () => clearInterval(interval);
  }, [playerId]);

  const remotePlayers = Object.entries(players).filter(
    ([id, player]) => id !== playerId && !isPlayerStale(player.last_seen)
  );

  return (
    <Canvas shadows camera={{ position: [0, 2.5, 5], fov: 50 }}>
      <Environment />
      <FollowCamera targetRef={myPositionRef} />
      <LocalPlayer positionRef={myPositionRef} />

      {remotePlayers.map(([id, networkPosition]) => (
        <RemotePlayer
          key={id}
          networkPosition={networkPosition}
        />
      ))}
    </Canvas>
  );
}
