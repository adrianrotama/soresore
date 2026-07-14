# Soresore — Game architecture & handoff

> **For AI agents:** Read this before changing multiplayer, movement, camera, world, or avatar code. Visual/MVP direction: `AGENTS.md`. Next.js quirks: `node_modules/next/dist/docs/`. Session history: `CHANGELOG.md`. Asset authoring: `docs/blender-avatar.md`. **Supabase recreate:** `docs/supabase-setup.sql` + `docs/supabase-dashboard.md`.

### Doc maintenance (agents)

- **Do not edit during normal work.** Update `GAME.md` only when the user explicitly asks (typically end-of-day handoff). Tuned numbers live in code (`lib/trainRoute.js`, `lib/tileModels.js`, `component/Decoration.js`, etc.).
- **Do not change `SYNC_MS` casually.** Currently `200` ms (user-approved retune, 2026-06-24). Position heartbeat only — appearance and chat use immediate paths.

### Project rules (read before extending)

- **Cozy direction wins (`AGENTS.md`).** ACNH-inspired pedestal silhouette, sunset palette, stable camera. Challenge requests that hurt comfort or cozy feel.
- **Tile pedestal is the world unit anchor.** `TILE_SIZE = 2` m XZ; `TILE_LEVEL_HEIGHT = 1.0` m Y; mesh footprint **2.082 m**. Scale assets to the grid, not the reverse.
- **One pedestal GLB; palette via vertex-color repaint** (`TileModel`). New tile **type** → `TILE_PALETTES`. New tile **shape** (brick) → `TILE_MODEL_URLS` in `lib/tileModels.js`. **Water** → `WaterTile` + `lib/waterMaterial.js` (not the water GLB at runtime). **Slope** = procedural wedge (`SlopeTile.js`), not a GLB yet.
- **Default tiles: no PBR.** `MeshToonMaterial` + vertex colors. Exception: `TILE_NATIVE_COLOR` types keep authored GLB colors (still toon).
- **Ground Y:** `surfaceYAt` = tile top (decorations). `walkSurfaceYAt` = player snap (+ `cell.surfaceYOffset`). Never hard-code Y for tile content.
- **Decoration vs Landmark.** Grid props → `Decoration.js` (`{ kind, gx, gz }`). World structures → `Landmark.js` (`{ kind, … }`).
- **All world content** in `TEST_WORLD` (`lib/testWorld.js`). `<World data={…} />` is the single scene root.
- **Foot-snap in `useMemo`** (`EnvironmentModel`, `TileModel`) — **not** `useLayoutEffect` (caused one-frame ~1 m drop).
- **Train route Y** uses `TILE_LEVEL_HEIGHT` in `start[1]` / `end[1]` — don't hardcode `y = 0`.

Browser multiplayer 3D prototype. **One tab = one player** via Supabase auth (`sessionStorage` — tabs stay isolated). **Guests** = ephemeral anonymous cat (refresh → login). **Google** = chibi + creator. Position, yaw, appearance + chat sync via **Supabase Realtime**. **D1 OAuth** + **D2 appearance** done.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
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
component/TileMap.js        → 2D map → TileModel / Stairs / Slopes / WaterTile; cliff TileBank; shore-depth bake
component/TileModel.js      → tile GLB; palette repaint or nativeColor; foot-snap in useMemo
component/WaterTile.js      → stylized water plane + optional seabed; WaterClock drives shared uTime
component/StairTile.js      → procedural 4-step stair
component/SlopeTile.js    → procedural multi-tile wedge ramp
component/Decoration.js     → grid prop registry (PROP_COMPONENTS)
component/Landmark.js       → world structure registry (LANDMARK_COMPONENTS)
component/TrainConsist.js   → 3-car train, snake enter/exit, opacity fade
component/StationRailProps.js → train landmark wrapper
component/LocalPlayer.js    → input, movement, bob/squash, footsteps; PlayerAvatar | ChibiAvatar
component/RemotePlayer.js     → network vs visual position + yaw; remote walk blend
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
component/Environment.js      → sky, sun, clouds, cloud-sea, fog, lights; shadow frustum from mapBounds
component/SkyGradient.js      → procedural orange→blue gradient sky (shader dome)
component/Sun.js                → low-horizon billboard sun disc + halo
component/Clouds.js             → drifting flat cloud billboards
component/CloudSea.js           → horizontal mist field below the map (over-the-edge soft void fill)
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
lib/world.js                  → surfaceYAt, walkSurfaceYAt, canMoveTo, slopeHeightIndex
lib/decorationCollision.js    → world-space OBB collision volumes (meters)
lib/tileGrid.js               → TILE_SIZE, gridToWorld, worldZToGridGz
lib/tileModels.js             → TILE_PALETTES, TILE_MODEL_URLS, offsets
lib/testTileMap.js            → 30×51 map layout
lib/testWorld.js              → { map, origin, decorations, landmarks }
lib/trainRoute.js             → train route constants (source of truth for tuned numbers)
lib/environmentModels.js      → ENV_REGISTRY (url + collision per kind)
lib/mapBounds.js              → WORLD_BOUNDS_MIN/MAX, WORLD_CENTER, WORLD_SIZE (shadow + atmos footprint)
lib/shoreDepth.js             → BFS shore-distance DataTexture; isSeaWater (level ≤ -2)
lib/waterMaterial.js          → shared water / foam / seabed ShaderMaterials + setWaterDepthField
lib/skyTextures.js            → procedural canvas textures (sun glow, cloud puff)
lib/sunConfig.js              → `SUN_LIGHT_POSITION` shared by sun disc + directional light
lib/interpolation.js          → lerpPosition (remotes)
lib/gameAudio.js              → ambience + footstep ticks
lib/supabase.js               → Supabase client; sessionStorage per tab; flowType pkce
lib/playerIdentity.js         → auth (guest/Google), finishAuthFromUrl, claimDisplayName, savePlayerAppearance, profiles
lib/chat.js                   → CHAT_RADIUS, BUBBLE_TTL_MS, proximity helpers, senderLabel
```

---

## Multiplayer

```
playerId = auth.uid()  (guest anonymous OR Google — lib/playerIdentity.js)
LocalPlayer → positionRef { x, y, z, ry } (every frame)
Game → upsert on join + every SYNC_MS (x, y, z, ry, last_seen only — does not overwrite display_name or appearance)
Game → players state from select + realtime postgres_changes (incl. display_name, appearance, ry)
RemotePlayer → lerps visual toward network target; chibi when row has appearance, else guest cat
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
- **Appearance:** `players.appearance` jsonb (server) + `localStorage` cache (`soresore.appearance`). Immediate upsert on creator confirm / Edit look via `savePlayerAppearance()`. Init: server first; backfill from localStorage if server null.

### Supabase `players` table

| Column | Notes |
|--------|--------|
| `id` | uuid PK = `auth.uid()` |
| `x`, `y`, `z` | World position; spawn `y: TILE_LEVEL_HEIGHT + 0.5` |
| `ry` | Yaw radians (mesh `rotation.y`); default 0 |
| `last_seen` | Heartbeat |
| `display_name` | text, unique (lower trim), 2–24 chars; logged-in only |
| `appearance` | jsonb — chibi look; guests leave null |

Realtime on `players`. RLS: `authenticated` SELECT all rows; INSERT/UPDATE own row only. Channel `players-room`.

### Timing (`Game.js`)

| Constant | Value | Role |
|----------|-------|------|
| `SYNC_MS` | **200** | Position + yaw upsert interval (~5/s per player) |
| `STALE_MS` | 15000 | Drop stale remotes |
| `PRUNE_MS` | 2000 | Prune sweep |

`STALE_MS` (15s) >> `SYNC_MS` (200ms) — remotes should not prune while actively heartbeating.

---

## Local player (`LocalPlayer.js`)

**State:** `positionRef` in `Game.js` (mutable `{ x, y, z, ry }`). Mesh in `useFrame`. `ry` published each frame for Supabase heartbeat.

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

RLS: authenticated SELECT all; INSERT own row only. Realtime channel `chat-room` (INSERT events). **Chat sends are immediate** — not tied to `SYNC_MS`. **No initial history fetch** — each playing session starts with empty client log; only realtime INSERTs append.

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
| `targetYaw` / `visualYaw` | Network `ry` vs smoothed render yaw |

Never bind mesh directly to `Game.js` `players` state.

**Avatar:** `appearance` jsonb on row → `ChibiAvatar`; else `PlayerAvatar` cat with `paletteFromSeed(playerId)`. **Walk blend:** `moving01Ref` from lerped visual velocity (cat + chibi).

**Not done:** extrapolation; remote stair pitch lean.

---

## Camera

**Default:** `PlayerOrbitCamera` — damped OrbitControls, pivot follows player.

**Dev:** `` ` `` / F2 → `FollowCamera` (legacy fixed offset). No sinus sway (`AGENTS.md`).

Canvas: `camera={{ position: [0, 2.5, 5], fov: 50 }}`. `shadows={{ type: THREE.PCFShadowMap }}` (not `PCFSoftShadowMap` — deprecated in r184).

**Post FX (`Game.js`):** subtle `Bloom` + soft `Vignette` via `@react-three/postprocessing` — bloom `luminanceThreshold` high so only the sun disc / bright highlights glow; toon tiles stay flat.

---

## Sky & atmosphere

**Mount:** `Environment.js` inside `<Canvas>` (before `<World>`).

| Piece | File | Notes |
|--------|------|--------|
| Gradient sky | `SkyGradient.js` | Inverted shader dome; `SKY_HORIZON` / `SKY_MID` / `SKY_ZENITH`; `SKY_CURVE` widens orange band |
| Sun disc | `Sun.js` | Billboard + additive halo; `toneMapped={false}`; position from `sunVisualPosition()` |
| Clouds | `Clouds.js` | Flat billboards, slow X drift; `CLOUD_PUFFS` table |
| Cloud sea | `CloudSea.js` | Horizontal mist billboards below the map; softens over-the-edge void |
| Textures | `lib/skyTextures.js` | Procedural canvas radial gradients (no image assets) |
| Sun direction | `lib/sunConfig.js` | `SUN_LIGHT_POSITION` — shared by visible sun + shadow-casting directional light |
| Map footprint | `lib/mapBounds.js` | `WORLD_BOUNDS_*` / `WORLD_CENTER` / `WORLD_SIZE` — shared by shadow frustum + atmos |

**Lighting mood:** soft diffused golden hour — higher ambient/hemisphere fill, low-horizon warm sun directional, cool fill from opposite side. Fog color matches warm horizon haze (`#e3a377`).

**Shadow frustum:** `Environment.js` fits the sun directional light's orthographic shadow camera to the map AABB (`WORLD_BOUNDS_MIN/MAX` from `mapBounds.js`) projected onto the light's forward/right/up axes — **not** a hand-picked world-space `±N` box. Low oblique sun tilts those axes; symmetric guesses clip one map side. **Do not clamp shadow `near` to a positive floor** — sun sits near/inside the bounds, so part of the map has negative forward distance; `OrthographicCamera` tolerates negative `near`.

**Tuning:** sky colors/curve in `SkyGradient.js`; cloud density in `Clouds.js`; bloom/vignette in `Game.js`; sun angle in `lib/sunConfig.js`. Recompute `WORLD_BOUNDS_*` / `SUN_TARGET` if map footprint changes.

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
{ hair, hairColor, face, skinColor, outfit, outfitColor }
```

Registries: `lib/avatarParts.js`. Persisted: `players.appearance` (server) + `localStorage` key `soresore.appearance` via `lib/appearanceStorage.js` (cache). `normalizeAppearance()` is the validation source of truth.

### Character creator (`CharacterCreator.js`)

| Feature | Behavior |
|---------|----------|
| Gate | Logged-in user without server or `localStorage` appearance |
| Reopen | **Edit look** — appearance only; name locked |
| Name | **Not here** — `NameModal` before creator (one-time, server unique) |
| Tabs | Hair / Face / Outfit — style chips + color swatches (8 each for hair/outfit) |
| Preview | Nested Canvas + ChibiAvatar; drag rotate; pause/resume spin |
| Camera | Hair/Face → head zoom; Outfit → full body (`PreviewCamera` lerp) |
| Facing | `PREVIEW_FACING_YAW = Math.PI` offsets body rotation so preview faces camera |
| Confirm | Saves to `localStorage` + `savePlayerAppearance()`, `avatarKind = "chibi"`, unpauses world |

**Dev keys:** `4` cat↔chibi, `5` face, `6` hair style, `7` outfit style.

### Next (avatar)

Guest emotes; new hair/shirt GLBs (`docs/blender-avatar.md`).

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
- **Slope cells** add: `slopePart` (0 = low end), `slopeSpan` (tiles in run, default 3), `slopeRise` (level steps climbed, default 1), `surfaceType` (palette key, e.g. `"grass"`).

### Tile system

- Standard pedestal: 2.082 × 2.082 × 1.0 m, vertex-color repaint via `TILE_PALETTES`.
- **brick**: dedicated GLB, `TILE_NATIVE_COLOR`, Y offset in `tileModels.js`.
- **water**: **not** the water GLB at runtime — `WaterTile` procedural planes via shared `ShaderMaterial`s in `lib/waterMaterial.js` (waves, ripples, sun glitter, foam). Surface Y = tile top of `cell.level`. Non-walkable by default; bridge fords still use `walkable: true` + `surfaceYOffset`.
- **Shore depth:** `lib/shoreDepth.js` bakes a BFS shore-distance `DataTexture` (0 = shore, 1 = deep). `TileMap` calls `setWaterDepthField` once per map. Open sea (`isSeaWater`: `type === "water"` and `level ≤ -2`) gets a sloped sandy seabed + clear→opaque alpha so sand shows in shallows. **River** water is forced depth = 1 (opaque teal, **no seabed**).
- **TileBank**: cliff plug under cells; skipped for water, slope, and offset types.
- **StairTile**: procedural 4-step; `surfaceYAt` returns upper landing. Climb-axis alignment required (can't step off sideways).
- **SlopeTile**: one procedural wedge per run (rendered on `slopePart: 0` only); length = `slopeSpan × TILE_SIZE`, height = `slopeRise × TILE_LEVEL_HEIGHT`. Palette from `surfaceType` via existing `TILE_PALETTES`. May step sideways off ramp onto flats (height rules only); stairs still axis-locked.
- **Bridge ford** (`BP`/`BW` cells): `surfaceYOffset` lifts player only — not decorations (`walkSurfaceYAt` split).

### Water tuning

| Knob | Where | Notes |
|------|--------|--------|
| Shallow band width | `MAX_SHORE_CELLS` in `shoreDepth.js` | ~4 cells shore→deep |
| Water alpha | `waterMaterial.js` fragment | `mix(0.22, 0.95, depth)` — sea only (river forced deep) |
| Seabed dip | `SEABED_DIP` in `waterMaterial.js` | ~1.4 m down when deep |
| Sand colors | `SAND_SHORE` / `SAND_DEEP` | Matches sand tile palette feel |
| Fog match | `FOG_*` in `waterMaterial.js` | Keep in sync with `Environment.js` fog |

### Slope authoring (`testTileMap.js`)

Place **one cell per row/col** along the climb axis; parts `0 … slopeSpan - 1`. All cells in a run share `level`, `rotation`, `slopeSpan`, `slopeRise`, `surfaceType`.

```js
// 2 levels over 4 tiles — rotation π climbs toward -Z (part 0 at highest gz)
{ type: "slope", level: 1, rotation: Math.PI, slopePart: 0, slopeSpan: 4, slopeRise: 2, surfaceType: "grass" }
```

- `level` = walk height index at the **low** end.
- Top landing flat tile: `level + slopeRise - 1` (flat walk height = `level + rise`).
- Height math: `slopeHeightIndex` / `slopeProgress01` in `lib/world.js`; mesh offset via `slopeMeshWorldOffset`.

### Props & landmarks

- **Decorations:** `{ kind, gx, gz, rotation?, scale?, offset? }` in `testWorld.js`. Kinds in `Decoration.js` `PROP_COMPONENTS`; URLs + collision in `lib/environmentModels.js` `ENV_REGISTRY`.
- **Landmarks:** train route `{ kind: "train", start, end, speed?, respawnMs? }`, konbini, etc. Tuned train numbers in `lib/trainRoute.js` only.
- **Loader:** `EnvironmentModel` — `useGLTF`, foot-snap in `useMemo`, prefer `.glb`.
- **Rails:** manual placement; straight segments spaced 4 cells (8 m). `railCrossing` uses `scale` 0.02 in component.
- **Collision:** `decorationCollision.js` builds world-space oriented boxes (OBBs) in meters; player uses circle-vs-OBB checks. Dev overlay: `CollisionDebug` (red boxes = truth). Train has no collision.

### Known world gaps

- Collision is built at module load (`world.collisionVolumes`) — restart dev after registry edits.
- Slope GLB swap pending (rounded-edge wedge to match pedestal); procedural wedge is fine for MVP.
- Stair GLB swap pending; tile InstancedMesh optimization (Phase 6) not started.

---

## Handoff — continue here

**State (2026-07-14):** **Stylized water + edge atmos** — `WaterTile` + shared toon water/foam shaders; sea gets shore-distance sandy seabed (shallow→deep); river opaque (no sand). `CloudSea` under the map softens the slab edge. Subtle vignette with existing bloom. Bounds extracted to `lib/mapBounds.js` for shadow frustum. **Sky / slopes / OBB / D2 / chat** otherwise unchanged.

### Next (priority order)

1. **Toon-convert environment props** — `EnvironmentModel` still loads raw GLB materials; tiles/avatars use `MeshToonMaterial` (visual cohesion).
2. **PR 8b** — guest emotes; remote stair pitch lean (optional polish).
3. **Realtime efficiency** — if free-tier message quota bites, consider Broadcast for position or adaptive sync when idle.

### Open bugs / traps

- **Foot-snap:** must stay in `useMemo`, not `useLayoutEffect`.
- **Bridge Y:** walk lift on `walkSurfaceYAt` only — `surfaceYOffset` on `surfaceYAt` moved bridge + cat together.
- **Rail `gz`:** use `worldZToGridGz` (half-cell offset vs integer division).
- **Slope:** one mesh per run on `slopePart: 0`; `slopeSpan` / `slopeRise` must match across all parts in the run. Sideways step uses height delta (≤ 1 level/step), not climb-axis alignment.
- **Collision:** use meter-sized OBB volumes (not grid tiles). Red debug boxes in `CollisionDebug` are the authoritative blocker.
- **OAuth callback:** Supabase may return `#access_token=` hash — `finishAuthFromUrl()` handles both hash and `?code=`.
- **Guest refresh:** always returns to login (intentional); clears anonymous session on load.
- **Position upsert:** only `{ id, x, y, z, ry, last_seen }` — never include `display_name` or `appearance`.
- **Chat Html:** bubble/name tag need `width: max-content` — do not remove.
- **Chat panel:** collapsed log uses `slice(-2)` — do not rely on scroll position when unfocused.
- **Sky gradient:** use view elevation `max(vWorldDir.y, 0)` — do not remap with `(y * 0.5 + 0.5)` (puts orange below horizon); never `discard` below horizon (exposes mismatched canvas color).
- **Sun shadows:** fit frustum in light view space; do not clamp orthographic `near` to `0.1` when sun is inside/near map bounds.
- **Water:** do not reintroduce a drifting sine color band for base water (reads as unnatural "spotlights"). Sea = `level ≤ -2`; river must stay forced-opaque / no seabed unless intentionally changed. Keep `waterMaterial.js` fog constants matched to `Environment.js`.
- **eslint:** `react-hooks/refs`, `immutability`, `set-state-in-effect` off in `eslint.config.mjs` for r3f `useFrame` patterns.

### Deferred

Surface footsteps by zone; diary/friend popups; second train; station hut re-wire; face UV-paint polish; remote position extrapolation; remote slope pitch lean.

---

## Related docs

| File | Contents |
|------|----------|
| `CHANGELOG.md` | End-of-day session history |
| `docs/supabase-setup.sql` | Full schema + RLS — run on new Supabase project |
| `docs/supabase-dashboard.md` | Auth, Google OAuth, Realtime, env checklist |
| `docs/blender-avatar.md` | Fit hair/shirt GLBs in Blender |
| `AGENTS.md` | Visual direction, cozy camera rules |
