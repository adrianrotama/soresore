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
import ChatPanel from "@/component/ChatPanel";
import LoginScreen from "@/component/LoginScreen";
import NameModal from "@/component/NameModal";
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
import {
  claimDisplayName,
  clearEphemeralGuestSession,
  finishAuthFromUrl,
  getAuthState,
  getDisplayName,
  getPlayerProfile,
  setDisplayName as persistDisplayName,
  signInAsGuest,
  signInWithGoogle,
} from "@/lib/playerIdentity";
import {
  appendMessage,
  getActiveBubbleMessage,
  messageFromRow,
  MESSAGE_HISTORY_MAX,
  senderLabel,
} from "@/lib/chat";
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
    display_name: row.display_name ?? null,
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
  const [phase, setPhase] = useState("loading");
  const [playerId, setPlayerId] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const guestPalette = useMemo(
    () => (playerId ? paletteFromSeed(playerId) : null),
    [playerId]
  );
  const spawn = { x: 0, y: TILE_LEVEL_HEIGHT + 0.5, z: 16 };
  const myPositionRef = useRef(spawn);
  /** Dev only: ` / F2 toggles fixed follow cam (legacy) vs default orbit. */
  const [useLegacyFollow, setUseLegacyFollow] = useState(false);
  /** Dev only: `4` toggles guest cat vs chibi avatar. */
  const [avatarKind, setAvatarKind] = useState("cat");
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  /** Dev only: `2` cycles GUEST_CAT_PRESETS for local cat color tuning. */
  const [devPresetIndex, setDevPresetIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  /** Re-render bubble proximity / TTL on a timer. */
  const [bubbleTick, setBubbleTick] = useState(0);
  /** Freeze movement while the chat input is focused. */
  const [chatFocused, setChatFocused] = useState(false);
  const catModel = DEFAULT_PLAYER_CAT;
  const localGuestPalette = IS_DEV
    ? GUEST_CAT_PRESETS[devPresetIndex]
    : guestPalette;

  const isPlaying = phase === "playing";
  const overlayOpen = phase === "name" || phase === "creator" || creatorOpen;
  const movementPaused = overlayOpen || chatFocused;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const exchange = await finishAuthFromUrl();
        if (cancelled) return;
        if (exchange.ok === false) {
          console.error("[Game] OAuth code exchange failed:", exchange.error);
          setPhase("login");
          return;
        }

        const auth = await getAuthState();
        if (cancelled) return;

        if (auth.kind === "none") {
          setPhase("login");
          return;
        }

        if (auth.kind === "guest") {
          // Guest play is per-visit only — refresh returns to login.
          await clearEphemeralGuestSession();
          if (cancelled) return;
          setPhase("login");
          return;
        }

        setPlayerId(auth.userId);

        let profile = null;
        try {
          profile = await getPlayerProfile(auth.userId);
        } catch (profileErr) {
          // Google users use the `authenticated` role — RLS must allow SELECT own row.
          console.error("[Game] profile fetch failed:", profileErr);
        }
        if (cancelled) return;

        const serverName = profile?.display_name?.trim();
        if (!serverName) {
          setPhase("name");
          return;
        }

        setDisplayName(serverName);
        persistDisplayName(serverName);

        const saved = loadAppearance();
        setAppearance(saved);
        if (hasCreatedCharacter()) {
          setHasCreated(true);
          setAvatarKind("chibi");
          setPhase("playing");
        } else {
          setAvatarKind("chibi");
          setCreatorOpen(true);
          setPhase("creator");
        }
      } catch (err) {
        console.error("[Game] init failed:", err);
        if (cancelled) return;
        try {
          const auth = await getAuthState();
          if (auth.kind === "logged_in") {
            setPlayerId(auth.userId);
            setPhase("name");
            return;
          }
        } catch {
          // fall through to login
        }
        setPhase("login");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleContinueAsGuest() {
    const userId = await signInAsGuest();
    setPlayerId(userId);
    setDisplayName(getDisplayName(userId));
    setAvatarKind("cat");
    setDevPresetIndex(presetIndexFromSeed(userId));
    setPhase("playing");
  }

  async function handleSignInWithGoogle() {
    await signInWithGoogle();
  }

  async function handleNameSubmit(name) {
    let uid = playerId;
    if (!uid) {
      const auth = await getAuthState();
      if (auth.kind !== "logged_in") return "unknown";
      uid = auth.userId;
      setPlayerId(uid);
    }

    const result = await claimDisplayName(uid, name, myPositionRef.current);
    if (!result.ok) {
      return result.error ?? "unknown";
    }

    setDisplayName(result.displayName);
    setAppearance(loadAppearance());
    setAvatarKind("chibi");
    setCreatorOpen(true);
    setPhase("creator");
    return null;
  }

  function handleConfirmAppearance(next) {
    setAppearance(next);
    setAvatarKind("chibi");
    saveAppearance(next);
    setHasCreated(true);
    setCreatorOpen(false);
    setPhase("playing");
  }

  // Network-authoritative positions from Supabase (not rendered directly).
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleTick((tick) => tick + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!playerId || !isPlaying) return;

    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(MESSAGE_HISTORY_MAX);

      if (data) {
        setMessages(data.reverse().map(messageFromRow));
      }
    }

    loadMessages();

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = messageFromRow(payload.new);
          setMessages((prev) => appendMessage(prev, message));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, isPlaying]);

  async function handleSendMessage(body) {
    if (!playerId) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: playerId,
      body,
    });
    if (error) console.error("[Game] send message failed:", error);
  }

  useEffect(() => {
    if (!IS_DEV || !isPlaying) return;

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
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    async function loadPlayers() {
      const { data } = await supabase
        .from("players")
        .select("id, x, y, z, last_seen, display_name");

      if (!data) return;

      const map = {};
      for (const row of data) {
        if (isPlayerStale(row.last_seen)) continue;
        map[row.id] = playerFromRow(row);
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
  }, [isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) => pruneStalePlayers(prev));
    }, PRUNE_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!playerId || !isPlaying) return;

    async function upsertPosition() {
      const { x, y, z } = myPositionRef.current;
      await supabase.from("players").upsert({
        id: playerId,
        x,
        y,
        z,
        last_seen: new Date().toISOString(),
      });
    }

    upsertPosition();
    const interval = setInterval(upsertPosition, SYNC_MS);
    return () => clearInterval(interval);
  }, [playerId, isPlaying]);

  const remotePlayers = Object.entries(players).filter(
    ([id, player]) => id !== playerId && !isPlayerStale(player.last_seen)
  );

  const myPos = myPositionRef.current;
  void bubbleTick;

  function bubbleTextFor(senderId) {
    const senderPos =
      senderId === playerId
        ? myPos
        : players[senderId]
          ? {
              x: players[senderId].x,
              y: players[senderId].y,
              z: players[senderId].z,
            }
          : null;

    return getActiveBubbleMessage(messages, senderId, myPos, senderPos)?.body ?? null;
  }

  const localBubbleText = playerId ? bubbleTextFor(playerId) : null;

  if (phase === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#252a37",
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(252, 181, 127, 0.35) 0%, rgba(37, 42, 55, 0.72) 60%)",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <>
      {phase === "login" && (
        <LoginScreen
          onGuest={handleContinueAsGuest}
          onGoogle={handleSignInWithGoogle}
        />
      )}

      {phase === "name" && <NameModal onSubmit={handleNameSubmit} />}

      {isPlaying && <GameAudio />}

      {IS_DEV && isPlaying && (
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

      {isPlaying && (
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
            paused={movementPaused}
            chatBubbleText={localBubbleText}
            nameTagText={displayName || null}
          />

          {remotePlayers.map(([id, networkPosition]) => (
            <RemotePlayer
              key={id}
              playerId={id}
              networkPosition={networkPosition}
              avatarKind="cat"
              appearance={appearance}
              catModel={catModel}
              chatBubbleText={bubbleTextFor(id)}
              nameTagText={senderLabel(
                id,
                playerId,
                displayName,
                networkPosition.display_name
              )}
            />
          ))}
        </Canvas>
      )}

      {isPlaying && hasCreated && avatarKind === "chibi" && !creatorOpen && (
        <button
          type="button"
          className={creatorStyles.reopenBtn}
          onClick={() => {
            setCreatorOpen(true);
            setPhase("creator");
          }}
        >
          Edit look
        </button>
      )}

      {isPlaying && hasCreated && !creatorOpen && (
        <ChatPanel
          messages={messages}
          playerId={playerId}
          displayName={displayName}
          players={players}
          onSend={handleSendMessage}
          onTypingChange={setChatFocused}
          ready={Boolean(playerId)}
        />
      )}

      <CharacterCreator
        open={phase === "creator" || creatorOpen}
        appearance={appearance}
        canClose={hasCreated}
        onConfirm={handleConfirmAppearance}
        onClose={() => {
          setCreatorOpen(false);
          if (phase === "creator") {
            setPhase("playing");
          }
        }}
      />
    </>
  );
}
