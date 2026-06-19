# Soresore — Game architecture & handoff

> **For AI agents:** Read this before changing multiplayer, movement, camera, world, or avatar code. Visual/MVP direction: `AGENTS.md`. Next.js quirks: `node_modules/next/dist/docs/`. Session history: `CHANGELOG.md`. Asset authoring: `docs/blender-avatar.md`. **Supabase recreate:** `docs/supabase-setup.sql` + `docs/supabase-dashboard.md`.

### Doc maintenance (agents)

- **Do not edit during normal work.** Update `GAME.md` only when the user explicitly asks (typically end-of-day handoff). Tuned numbers live in code (`lib/trainRoute.js`, `lib/tileModels.js`, `component/Decoration.js`, etc.).
- **Do not “fix” `SYNC_MS` in `Game.js`.** It is intentionally `50000` (50s) to limit Supabase writes while prototyping.

### Project rules (read before extending)

- **Cozy direction wins (`AGENTS.md`).** ACNH-inspired pedestal silhouette, sunset palette, stable camera. Challenge requests that hurt comfort or cozy feel.
- **Tile pedestal is the world unit anchor.** `TILE_SIZE = 2` m XZ; `TILE_LEVEL_HEIGHT = 1.0` m Y; mesh footprint **2.082 m**. Scale assets to the grid, not the reverse.
- **One pedestal GLB; palette via vertex-color repaint** (`TileModel`). New tile **type** → `TILE_PALETTES`. New tile **shape** (water, brick, slope) → `TILE_MODEL_URLS` in `lib/tileModels.js`.
- **Default tiles: no PBR.** `MeshToonMaterial` + vertex colors. Exception: `TILE_NATIVE_COLOR` types keep authored GLB colors (still toon).
- **Ground Y:** `surfaceYAt` = tile top (decorations). `walkSurfaceYAt` = player snap (+ `cell.surfaceYOffset`). Never hard-code Y for tile content.
- **Decoration vs Landmark.** Grid props → `Decoration.js` (`{ kind, gx, gz }`). World structures → `Landmark.js` (`{ kind, … }`).
- **All world content** in `TEST_WORLD` (`lib/testWorld.js`). `<World data={…} />` is the single scene root.
- **Foot-snap in `useMemo`** (`EnvironmentModel`, `TileModel`) — **not** `useLayoutEffect` (caused one-frame ~1 m drop).
- **Train route Y** uses `TILE_LEVEL_HEIGHT` in `start[1]` / `end[1]` — don't hardcode `y = 0`.

Browser multiplayer 3D prototype. **One tab = one player** via Supabase auth (`sessionStorage` — tabs stay isolated). **Guests** = ephemeral anonymous cat (refresh → login). **Google** = chibi + creator. Positions + chat sync via **Supabase Realtime**. **D1 OAuth done**; **D2** appearance sync pending.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Backend | Supabase (Postgres + Realtime) |

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## File map

```
app/page.js                 → full-viewport <Game />
app/auth/callback/page.js     → OAuth return; hash + PKCE session handoff
component/Game.js           → phase machine, Canvas, Supabase sync, mounts <World>
component/LoginScreen.js    → Google + Continue as guest (ACNH overlay)
component/NameModal.js      → one-time unique display_name (logged-in only)
component/OnboardingShell.module.scss → shared sunset/CRT modal styles
component/World.js          → TileMap + Decoration[] + Landmark[]; dev CollisionDebug
component/TileMap.js        → 2D map → <TileModel>; cliff TileBank
component/TileModel.js      → tile GLB; palette repaint or nativeColor; foot-snap in useMemo
component/StairTile.js      → procedural 4-step stair
component/Decoration.js     → grid prop registry (PROP_COMPONENTS)
component/Landmark.js       → world structure registry (LANDMARK_COMPONENTS)
component/TrainConsist.js   → 3-car train, snake enter/exit, opacity fade
component/StationRailProps.js → train landmark wrapper
component/LocalPlayer.js    → input, movement, bob/squash, footsteps; PlayerAvatar | ChibiAvatar
component/RemotePlayer.js     → network vs visual position
component/PlayerAvatar.js   → guest Quaternius cat, Idle/Walk
component/ChibiAvatar.js      → body + hair + skinned outfit + face decal
component/CharacterCreator.js → avatar customizer overlay (3D preview, tabs; appearance only)
component/CharacterCreator.module.scss
component/ChatPanel.js          → bottom-center chat log + input (focus/hover states)
component/ChatPanel.module.scss
component/ChatBubble.js          → 3D speech bubble (`Html`; `CHAT_BUBBLE_Y`)
component/ChatBubble.module.scss
component/NameTag.js              → display name above avatar (`Html`)
component/NameTag.module.scss
component/PlayerOrbitCamera.js → default orbit follow
component/FollowCamera.js   → legacy fixed follow (dev toggle)
component/Environment.js      → ground, fog, lights
component/EnvironmentModel.js → GLB loader, foot-snap in useMemo
component/GameAudio.js        → Web Audio unlock
component/CollisionDebug.js   → dev collision wireframes
lib/avatarModels.js           → CHIBI_BASE_MODEL
lib/avatarParts.js            → HAIR/FACE/OUTFIT parts + HAIR_COLORS/OUTFIT_COLORS
lib/appearanceStorage.js      → localStorage appearance
lib/faceCanvasTexture.js      → procedural face texture
lib/playerModels.js           → guest cat registry (Quaternius only)
lib/guestCatPalette.js        → GUEST_CAT_PRESETS, paletteFromSeed
lib/quaterniusRecolor.js      → UV zone vertex recolor
lib/world.js                  → surfaceYAt, walkSurfaceYAt, canMoveTo, cellSurfaceWorld
lib/decorationCollision.js    → grid footprints, buildDecorationBlockedSet
lib/tileGrid.js               → TILE_SIZE, gridToWorld, worldZToGridGz
lib/tileModels.js             → TILE_PALETTES, TILE_MODEL_URLS, offsets
lib/testTileMap.js            → 30×46 map layout
lib/testWorld.js              → { map, origin, decorations, landmarks }
lib/trainRoute.js             → train route constants (source of truth for tuned numbers)
lib/environmentModels.js      → ENV_REGISTRY (url + collision per kind)
lib/interpolation.js          → lerpPosition (remotes)
lib/gameAudio.js              → ambience + footstep ticks
lib/supabase.js               → Supabase client; sessionStorage per tab; flowType pkce
lib/playerIdentity.js         → auth (guest/Google), finishAuthFromUrl, claimDisplayName, profiles
lib/chat.js                   → CHAT_RADIUS, BUBBLE_TTL_MS, proximity helpers, senderLabel
```

---

## Multiplayer

```
playerId = auth.uid()  (guest anonymous OR Google — lib/playerIdentity.js)
LocalPlayer → positionRef (every frame)
Game → upsert on join + every SYNC_MS (position only — does not overwrite display_name)
Game → players state from select + realtime postgres_changes (incl. display_name)
RemotePlayer → lerps visual toward network target; avatarKind hardcoded cat until D2
Stale players pruned via last_seen (no DELETE)
```

**Dashboard:** enable **Anonymous sign-ins** + **Google** (Auth). Realtime on `players` and `messages`. Full recreate: `docs/supabase-setup.sql`, `docs/supabase-dashboard.md`.

### Auth & onboarding (Phase D1 done)

| Phase | UI | Avatar |
|-------|-----|--------|
| `login` | `LoginScreen` | — |
| `name` | `NameModal` — unique `display_name`, one-time | — |
| `creator` | `CharacterCreator` — appearance only | chibi preview |
| `playing` | world + chat | guest=cat, logged-in=chibi |

- **Guest:** `signInAsGuest()` → play as cat; **refresh signs out** → login again (ephemeral).
- **Google:** `signInWithOAuth` → `/auth/callback` → `finishAuthFromUrl()` (handles `#access_token` hash **and** `?code=` PKCE).
- **Name:** `claimDisplayName()` upserts `players.display_name`; case-insensitive unique index; not editable after claim.
- **Appearance:** still `localStorage` only — **D2** will add `players.appearance` jsonb.

### Supabase `players` table

| Column | Notes |
|--------|--------|
| `id` | uuid PK = `auth.uid()` |
| `x`, `y`, `z` | World position; spawn `y: TILE_LEVEL_HEIGHT + 0.5` |
| `last_seen` | Heartbeat |
| `display_name` | text, unique (lower trim), 2–24 chars; logged-in only |

Realtime on `players`. RLS: `authenticated` SELECT all rows; INSERT/UPDATE own row only. Channel `players-room`.

### Timing (`Game.js`)

| Constant | Value | Role |
|----------|-------|------|
| `SYNC_MS` | **50000** | Upsert interval — intentional; do not lower without approval |
| `STALE_MS` | 15000 | Drop stale remotes |
| `PRUNE_MS` | 2000 | Prune sweep |

**Note:** `SYNC_MS` > `STALE_MS` today — remotes may prune quickly until timing is retuned together.

---

## Local player (`LocalPlayer.js`)

**State:** `positionRef` in `Game.js` (mutable). Mesh in `useFrame`.

**Movement:** camera-relative WASD → velocity with separate accel/decel. `canMoveTo` with axis slide before applying XZ.

**Camera basis:** `forward` = camera→player on XZ; `right` = `{ x: -forward.z, z: forward.x }`.

**Rotation:** yaw toward velocity; on reversal face input; `MAX_TURN_SPEED` caps snap.

**Input safety:** clear keys on `blur` / `visibilitychange`.

**Visual bob/squash (local only):** `movePhaseRef`, `moving01` (0..1). Constant `MOVE_BOB_HZ` + phase accumulator — don't oscillate frequency per frame.

**Footsteps:** `consumeStepTicks` — one tick per full bob cycle (`STEP_PHASE_RADIANS = 2π`).

**`paused` prop:** when `CharacterCreator` is open **or chat input is focused**, clears keys and skips movement integration.

---

## Chat (Phase E1 done)

**Identity:** `auth.uid()` → `players.id` and `messages.sender_id`. **Logged-in** display name on server (`players.display_name`); session cache `soresore.displayName`. **Guests** = `Guest-xxxx` from id slice. Chat/remotes read `display_name` from `players` row when present.

### Supabase `messages` table

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `sender_id` | uuid FK → `auth.users(id)` |
| `body` | text, max 140 chars |
| `created_at` | timestamptz |

RLS: authenticated SELECT all; INSERT own row only. Realtime channel `chat-room` (INSERT events). **Chat sends are immediate** — not tied to `SYNC_MS`.

### Proximity bubbles

Constants in `lib/chat.js`: `CHAT_RADIUS` (~10 m XZ), `BUBBLE_TTL_MS` (~10 s). `Game.js` filters active bubble per sender using local position + remote `players` positions. Rendered via `ChatBubble` + `NameTag` on `LocalPlayer` / `RemotePlayer`.

**Html trap:** drei `<Html>` wrapper collapses width → one char per line. Fix: `width: max-content` on wrapper + bubble; `word-break: normal`.

### Chat panel (`ChatPanel.js`)

Shown only when `phase === playing` && `hasCreated` (logged-in chibi after creator confirm). Bottom-center; ACNH cream/mint styling.

| State | Log | Bar | Movement |
|-------|-----|-----|----------|
| Default | 2 lines, last 2 msgs (`slice(-2)`), semi-transparent | dim | walks |
| Bar hover | unchanged | full opacity | walks |
| Input focus | 4 lines, full history, scroll | full opacity | **paused** |

### Not done (chat)

Whispers/friends; diary popup; rate limits.

---

## Remote players (`RemotePlayer.js`)

| Ref | Purpose |
|-----|---------|
| `networkTarget` | Latest Supabase position |
| `visualPosition` | Lerped render position |

Never bind mesh directly to `Game.js` `players` state.

**Not done:** remote walk blend; extrapolation; networked appearance (**D2** — remotes render as cat today).

---

## Camera

**Default:** `PlayerOrbitCamera` — damped OrbitControls, pivot follows player.

**Dev:** `` ` `` / F2 → `FollowCamera` (legacy fixed offset). No sinus sway (`AGENTS.md`).

Canvas: `camera={{ position: [0, 2.5, 5], fov: 50 }}`.

---

## Audio

- Unlock: first key/pointer via `GameAudio` → `unlockGameAudio()`.
- Loop: `public/audio/ambiances/abeto-base.ogg`.
- Steps: `footstep-grass.wav` one-shots gated by `moving01` + bob phase.
- Tab hidden: mute + suspend context.

Tuning in `lib/gameAudio.js` (`FOOTSTEP_VOLUME`, `AMBIENCE_VOLUME`, `MIN_MOVING_FOR_STEP`, `STEP_PHASE_RADIANS`).

---

## Guest cat (Phase A)

**Default:** Quaternius `Cat-Quarternius.glb` via `PlayerAvatar.js`. `SkeletonUtils.clone` for skinned instances. Idle/Walk cross-fade (`moving01 > 0.15`). Run/emotes not wired.

**Colors:** `paletteFromSeed(playerId)` → one of 8 `GUEST_CAT_PRESETS`. UV zones recolored in `quaterniusRecolor.js`.

**Dev keys:** `2` cycle local preset; `` ` ``/F2 camera toggle.

---

## Chibi avatar + creator (Phase C3 done, D1 gated)

**Goal:** Logged-in (Google) = modular chibi + creator. Guests = cat only.

### Parts

```
Body   → player-base.glb (skinned, idle + run)
Hair   → rigid GLB on mixamorigHead (HAIR_PARTS + HAIR_COLORS tint)
Face   → canvas decal (FACE_PARTS), synced each frame
Outfit → skinned tshirt.glb, rebinds to body skeleton (OUTFIT_PARTS + OUTFIT_COLORS)
```

Body Y rotation `Math.PI` in `avatarModels.js` for movement forward.

### `appearance`

```js
{ hair, hairColor, face, outfit, outfitColor }
```

Registries: `lib/avatarParts.js`. Persisted: `localStorage` key `soresore.appearance` via `lib/appearanceStorage.js`.

### Character creator (`CharacterCreator.js`)

| Feature | Behavior |
|---------|----------|
| Gate | Logged-in user without `localStorage` appearance |
| Reopen | **Edit look** — appearance only; name locked |
| Name | **Not here** — `NameModal` before creator (one-time, server unique) |
| Tabs | Hair / Face / Outfit — style chips + color swatches (8 each for hair/outfit) |
| Preview | Nested Canvas + ChibiAvatar; drag rotate; pause/resume spin |
| Camera | Hair/Face → head zoom; Outfit → full body (`PreviewCamera` lerp) |
| Facing | `PREVIEW_FACING_YAW = Math.PI` offsets body rotation so preview faces camera |
| Confirm | Saves appearance to `localStorage`, `avatarKind = "chibi"`, unpauses world |

**Dev keys:** `4` cat↔chibi, `5` face, `6` hair style, `7` outfit style.

### Next (avatar)

| ID | Task |
|----|------|
| **D2** | `players.appearance` jsonb + immediate upsert; remote chibi looks + walk blend |

New hair/shirt GLBs: `docs/blender-avatar.md`.

---

## World & tiles

**Root:** `<World data={TEST_WORLD} />`. Map **30×46**, origin `[-10, 0, -20]`.

### Y contract

```js
surfaceYAt(world, gx, gz)
  → origin[1] + (cell.level + 1) * TILE_LEVEL_HEIGHT   // decorations

walkSurfaceYAt(world, gx, gz)
  → surfaceYAt(...) + (cell.surfaceYOffset ?? 0)         // player only
```

- Decorations / `cellSurfaceWorld` → `surfaceYAt` only.
- `LocalPlayer` ground-snap → `walkSurfaceYAt` + `PLAYER_FOOT_OFFSET`.
- Cell: `{ type, level?, rotation?, walkable?, surfaceYOffset? }`.

### Tile system

- Standard pedestal: 2.082 × 2.082 × 1.0 m, vertex-color repaint via `TILE_PALETTES`.
- **brick** / **water**: dedicated GLBs, `TILE_NATIVE_COLOR`, Y offsets in `tileModels.js`. Water non-walkable.
- **TileBank**: cliff plug under cells; skipped for water and offset types.
- **StairTile**: procedural 4-step; `surfaceYAt` returns upper landing.
- **Bridge ford** (`BP`/`BW` cells): `surfaceYOffset` lifts player only — not decorations (`walkSurfaceYAt` split).

### Props & landmarks

- **Decorations:** `{ kind, gx, gz, rotation?, scale?, offset? }` in `testWorld.js`. Kinds in `Decoration.js` `PROP_COMPONENTS`; URLs + collision in `lib/environmentModels.js` `ENV_REGISTRY`.
- **Landmarks:** train route `{ kind: "train", start, end, speed?, respawnMs? }`, konbini, etc. Tuned train numbers in `lib/trainRoute.js` only.
- **Loader:** `EnvironmentModel` — `useGLTF`, foot-snap in `useMemo`, prefer `.glb`.
- **Rails:** manual placement; straight segments spaced 4 cells (8 m). `railCrossing` uses `scale` 0.02 in component.
- **Collision:** `decorationCollision.js` snaps footprints to 2 m grid. Dev overlay: `CollisionDebug`. Train has no collision.

### Known world gaps

- Decoration collision polish (railing thin footprints block whole tiles; possible same-cell pass-through in `canMoveTo`).
- `decorationBlocked` rebuilt at module load — restart dev after registry edits.
- Stair GLB swap pending; tile InstancedMesh optimization (Phase 6) not started.

---

## Handoff — continue here

**State (2026-06-19):** **D1 done** — `LoginScreen`, `NameModal`, Google OAuth + callback (hash + PKCE), guest ephemeral sessions, `players.display_name` unique, consolidated RLS, remote name tags. Chat **E1** + Chibi **C3** unchanged. **Remotes still render as cat** until D2. **Next: D2** appearance jsonb + immediate upsert.

### Next (priority order)

1. **D2 — Supabase profile** — `players.appearance` jsonb; immediate upsert on creator confirm/edit; `RemotePlayer` reads server look; guest stays cat.
2. **PR 5b** — decoration collision polish (`canMoveTo` same-cell pass-through, railings).
3. **PR 8b** — remote cat walk animation; guest emotes.
4. **Timing** — retune `STALE_MS` > `SYNC_MS` together when ready (remotes prune quickly today).

### Open bugs / traps

- **Foot-snap:** must stay in `useMemo`, not `useLayoutEffect`.
- **Bridge Y:** walk lift on `walkSurfaceYAt` only — `surfaceYOffset` on `surfaceYAt` moved bridge + cat together.
- **Rail `gz`:** use `worldZToGridGz` (half-cell offset vs integer division).
- **Collision:** white debug tiles sometimes passable; railings block full grid tiles in Z.
- **OAuth callback:** Supabase may return `#access_token=` hash — `finishAuthFromUrl()` handles both hash and `?code=`.
- **Guest refresh:** always returns to login (intentional); clears anonymous session on load.
- **RemotePlayer:** `avatarKind="cat"` hardcoded in `Game.js` until D2.
- **Chat Html:** bubble/name tag need `width: max-content` — do not remove.
- **Chat panel:** collapsed log uses `slice(-2)` — do not rely on scroll position when unfocused.

### Deferred

Surface footsteps by zone; diary/friend popups; second train; station hut re-wire; face UV-paint polish; remote position extrapolation.

---

## Related docs

| File | Contents |
|------|----------|
| `CHANGELOG.md` | End-of-day session history |
| `docs/supabase-setup.sql` | Full schema + RLS — run on new Supabase project |
| `docs/supabase-dashboard.md` | Auth, Google OAuth, Realtime, env checklist |
| `docs/blender-avatar.md` | Fit hair/shirt GLBs in Blender |
| `AGENTS.md` | Visual direction, cozy camera rules |
