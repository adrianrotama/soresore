"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import RemotePlayer from "@/component/RemotePlayer";
import LocalPlayer from "@/component/LocalPlayer";
import FollowCamera from "@/component/FollowCamera";
import PlayerOrbitCamera from "@/component/PlayerOrbitCamera";
import Environment from "@/component/Environment";
import World from "@/component/World";
import GameAudio from "@/component/GameAudio";
import { TEST_WORLD } from "@/lib/testWorld";
import { TILE_LEVEL_HEIGHT } from "@/lib/world";
import {
  DEFAULT_PLAYER_CAT,
  PLAYER_CAT_KEYS,
  PLAYER_CAT_MODELS,
} from "@/lib/playerModels";
import {
  GUEST_CAT_PRESETS,
  paletteFromSeed,
  presetIndexFromSeed,
} from "@/lib/guestCatPalette";

const IS_DEV = process.env.NODE_ENV === "development";

// Intentionally 50s — limits Supabase writes; do not lower without user approval (GAME.md).
const SYNC_MS = 50000;
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
  const guestPalette = useMemo(() => paletteFromSeed(playerId), [playerId]);
  const spawn = { x: 0, y: TILE_LEVEL_HEIGHT + 0.5, z: 16 }
  const myPositionRef = useRef(spawn);
  /** Dev only: ` / F2 toggles fixed follow cam (legacy) vs default orbit. */
  const [useLegacyFollow, setUseLegacyFollow] = useState(false);
  /** Dev only: `3` cycles guest cat prototype (Quaternius ↔ Tubbs). */
  const [catModel, setCatModel] = useState(DEFAULT_PLAYER_CAT);
  /** Dev only: `2` cycles GUEST_CAT_PRESETS for local cat color tuning. */
  const [devPresetIndex, setDevPresetIndex] = useState(() =>
    presetIndexFromSeed(playerId)
  );
  const localGuestPalette = IS_DEV
    ? GUEST_CAT_PRESETS[devPresetIndex]
    : guestPalette;
  // Network-authoritative positions from Supabase (not rendered directly).
  const [players, setPlayers] = useState({});

  useEffect(() => {
    if (!IS_DEV) return;

    function onKeyDown(e) {
      if (e.repeat) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "2") {
        setDevPresetIndex(
          (index) => (index + 1) % GUEST_CAT_PRESETS.length
        );
        return;
      }

      if (e.key === "3") {
        setCatModel((current) => {
          const index = PLAYER_CAT_KEYS.indexOf(current);
          return PLAYER_CAT_KEYS[(index + 1) % PLAYER_CAT_KEYS.length];
        });
        return;
      }

      if (e.key !== "`" && e.code !== "Backquote" && e.key !== "F2") return;

      setUseLegacyFollow((on) => !on);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    <>
      <GameAudio />
      {IS_DEV && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 10,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: "system-ui, sans-serif",
            color: "#252a37",
            background: "rgba(252, 181, 127, 0.92)",
            borderRadius: 6,
            pointerEvents: "none",
            lineHeight: 1.45,
          }}
        >
          {useLegacyFollow && <div>Legacy fixed follow (` or F2 for orbit)</div>}
          <div>
            Cat: {PLAYER_CAT_MODELS[catModel]?.label ?? catModel} (3 swap)
          </div>
          {catModel === "quaternius" && (
            <div>
              Preset: {localGuestPalette.name} ({devPresetIndex + 1}/
              {GUEST_CAT_PRESETS.length} · 2 cycle)
            </div>
          )}
        </div>
      )}
      <Canvas shadows camera={{ position: [0, 2.5, 5], fov: 50 }}>
        <Environment />
        <World data={TEST_WORLD} positionRef={myPositionRef} />
        {useLegacyFollow ? (
          <FollowCamera targetRef={myPositionRef} />
        ) : (
          <PlayerOrbitCamera positionRef={myPositionRef} />
        )}
        <LocalPlayer
          positionRef={myPositionRef}
          world={TEST_WORLD}
          catModel={catModel}
          guestPalette={catModel === "quaternius" ? localGuestPalette : null}
        />

        {remotePlayers.map(([id, networkPosition]) => (
          <RemotePlayer
            key={id}
            playerId={id}
            networkPosition={networkPosition}
            catModel={catModel}
          />
        ))}
      </Canvas>
    </>
  );
}
