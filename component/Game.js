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
import CharacterCreator from "@/component/CharacterCreator";
import { TEST_WORLD } from "@/lib/testWorld";
import { TILE_LEVEL_HEIGHT } from "@/lib/world";
import { DEFAULT_PLAYER_CAT } from "@/lib/playerModels";
import {
  GUEST_CAT_PRESETS,
  paletteFromSeed,
  presetIndexFromSeed,
} from "@/lib/guestCatPalette";
import {
  DEFAULT_APPEARANCE,
  FACE_KEYS,
  HAIR_KEYS,
  OUTFIT_KEYS,
} from "@/lib/avatarParts";
import {
  hasCreatedCharacter,
  loadAppearance,
  saveAppearance,
} from "@/lib/appearanceStorage";
import creatorStyles from "@/component/CharacterCreator.module.scss";

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
  /** Dev only: `4` toggles guest cat vs chibi avatar. */
  const [avatarKind, setAvatarKind] = useState("cat");
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  /** Character creator overlay — gate on first load, reopenable later. */
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  /** Dev only: `2` cycles GUEST_CAT_PRESETS for local cat color tuning. */
  const [devPresetIndex, setDevPresetIndex] = useState(() =>
    presetIndexFromSeed(playerId)
  );
  const catModel = DEFAULT_PLAYER_CAT;
  const localGuestPalette = IS_DEV
    ? GUEST_CAT_PRESETS[devPresetIndex]
    : guestPalette;

  // Hydrate saved look on mount; first-time visitors get the creator as a gate.
  // NOTE (Phase D1): gate this behind an OAuth login — guests stay cats; only
  // logged-in users see the creator / render as a chibi.
  useEffect(() => {
    const saved = loadAppearance();
    setAppearance(saved);
    if (hasCreatedCharacter()) {
      setHasCreated(true);
      setAvatarKind("chibi");
    } else {
      setAvatarKind("chibi");
      setCreatorOpen(true);
    }
  }, []);

  function handleConfirmAppearance(next) {
    setAppearance(next);
    setAvatarKind("chibi");
    saveAppearance(next);
    setHasCreated(true);
    setCreatorOpen(false);
  }
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

      if (e.key === "4") {
        setAvatarKind((kind) => (kind === "cat" ? "chibi" : "cat"));
        return;
      }

      if (e.key === "5") {
        setAppearance((current) => {
          const index = FACE_KEYS.indexOf(current.face ?? DEFAULT_APPEARANCE.face);
          const nextFace = FACE_KEYS[(index + 1) % FACE_KEYS.length];
          return { ...current, face: nextFace };
        });
        return;
      }

      if (e.key === "6") {
        setAppearance((current) => {
          const index = HAIR_KEYS.indexOf(current.hair ?? DEFAULT_APPEARANCE.hair);
          const nextHair = HAIR_KEYS[(index + 1) % HAIR_KEYS.length];
          return { ...current, hair: nextHair };
        });
        return;
      }

      if (e.key === "7") {
        setAppearance((current) => {
          const index = OUTFIT_KEYS.indexOf(
            current.outfit ?? DEFAULT_APPEARANCE.outfit
          );
          const nextOutfit = OUTFIT_KEYS[(index + 1) % OUTFIT_KEYS.length];
          return { ...current, outfit: nextOutfit };
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
            Avatar: {avatarKind === "chibi" ? "Chibi" : "Guest cat"} (4 toggle)
          </div>
          {avatarKind === "chibi" ? (
            <>
              <div>Hair: {appearance.hair} (6 cycle)</div>
              <div>Face: {appearance.face} (5 cycle)</div>
              <div>Outfit: {appearance.outfit} (7 cycle)</div>
            </>
          ) : (
            catModel === "quaternius" && (
              <div>
                Preset: {localGuestPalette.name} ({devPresetIndex + 1}/
                {GUEST_CAT_PRESETS.length} · 2 cycle)
              </div>
            )
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
          avatarKind={avatarKind}
          appearance={appearance}
          catModel={catModel}
          guestPalette={catModel === "quaternius" ? localGuestPalette : null}
          paused={creatorOpen}
        />

        {remotePlayers.map(([id, networkPosition]) => (
          <RemotePlayer
            key={id}
            playerId={id}
            networkPosition={networkPosition}
            avatarKind={avatarKind}
            appearance={appearance}
            catModel={catModel}
          />
        ))}
      </Canvas>

      {hasCreated && !creatorOpen && (
        <button
          type="button"
          className={creatorStyles.reopenBtn}
          onClick={() => setCreatorOpen(true)}
        >
          Edit look
        </button>
      )}

      <CharacterCreator
        open={creatorOpen}
        appearance={appearance}
        canClose={hasCreated}
        onConfirm={handleConfirmAppearance}
        onClose={() => setCreatorOpen(false)}
      />
    </>
  );
}
