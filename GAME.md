# Soresore — Game architecture & handoff

> **For AI agents:** Read this before changing multiplayer, movement, or camera code. Visual/MVP direction: `AGENTS.md`. Next.js quirks: `node_modules/next/dist/docs/`.

Browser multiplayer 3D prototype. One tab = one player. Positions sync via **Supabase**; remotes render as cubes. Target: cozy low-poly world (`AGENTS.md`), not a debug scene.
“Tiny cozy world”. Phase 1 Features: movement, chat, diary, friend.

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
component/Game.js           → Canvas, Supabase sync, mounts <GameAudio />
component/LocalPlayer.js    → local input, movement, bob/squash, footstep ticks
component/RemotePlayer.js   → remote mesh; network vs visual position
component/FollowCamera.js   → third-person follow (stable; no oscillating sway)
component/Environment.js    → ground, fog, lights, shadows
component/EnvironmentModel.js → load one GLB (useGLTF, shadows, ground snap)
component/StationRailProps.js → station rail slice: track, 3-car train, crossing
component/GameAudio.js      → unlock Web Audio on first key/pointer; tab mute
lib/supabase.js             → Supabase client
lib/environmentModels.js    → GLB URL constants + preload list
lib/interpolation.js        → smoothRate, lerpPosition (remotes; reusable)
lib/gameAudio.js            → ambience loop, one-shot footsteps, step phase ticks
public/audio/               → see Audio section
public/images/environments/ → Kenney GLBs (see Environment props section)
```

---

## Per-tab flow

```
playerId = crypto.randomUUID()
LocalPlayer → positionRef (every frame)
Game → upsert positionRef to Supabase every SYNC_MS
Game → players state from select + realtime postgres_changes
RemotePlayer → lerps visual position toward network target
Stale players removed from state via last_seen (no DELETE)
```

```
┌─────────────┐   upsert (5s)    ┌──────────────┐
│ Tab A       │ ───────────────► │  Supabase    │
│ LocalPlayer │ ◄── realtime ─── │  players     │
└─────────────┘                  └──────────────┘
        ▲                               │
        └──────── other tabs ───────────┘
```

---

## Supabase `players` table

| Column | Notes |
|--------|--------|
| `id` | uuid PK, client-generated per tab |
| `x`, `y`, `z` | World position; local spawn `y: 0.5` |
| `last_seen` | Heartbeat timestamp |

- Enable **Realtime** on `players`.
- RLS: anon `SELECT` + upsert. **No DELETE** — offline = stale `last_seen` + client prune.
- Channel `players-room`: client name for `postgres_changes` on `players`.

---

## Timing (`Game.js`)

| Constant | Value | Role |
|----------|-------|------|
| `SYNC_MS` | 5000 | Local upsert interval |
| `STALE_MS` | 15000 | Drop if `last_seen` older (`> SYNC_MS`) |
| `PRUNE_MS` | 2000 | Sweep stale ids from in-memory state |

Prune only clears React state, not DB rows.

---

## Local player (`LocalPlayer.js`)

**State:** `positionRef` in `Game.js` (mutable, no per-frame React updates). Mesh via `meshRef` in `useFrame`.

**Movement:** camera-relative WASD → world direction → velocity steers toward target with separate **accel** / **decel** (`1 - Math.exp(-rate * delta)`). Position: `pos += vel * delta`.

**Camera basis:** `forward` = horizontal camera→player; `right` = `forward × up` → `{ x: -forward.z, z: forward.x }` (wrong cross order reverses strafe).

**Rotation:** yaw toward velocity; on reversal (`dot(vel, input) < 0.25`) face **input**; `MAX_TURN_SPEED` caps snap on 180° turns.

**Input safety:** clear keys on `blur` and `visibilitychange` (hidden).

**Tuning:** `MAX_SPEED`, `ACCELERATION`, `DECELERATION`, `ROTATION_SMOOTH`, `MAX_TURN_SPEED` at top of file.

**Visual “physical lies” (local only — does not affect `positionRef` / Supabase):**

- `movePhaseRef`: continuous phase; advances at `MOVE_BOB_HZ` (default `2.0`).
- `moving01`: smoothed movement intensity in **0..1** (`moveIntensityRef` lerps toward `speed / MAX_SPEED`). Used for bob/squash strength and footstep gating/volume. Name is shader-style shorthand; consider renaming to `walkIntensity` if refactoring.
- Idle bob: `sin(time * IDLE_BOB_HZ)`; move bob: `sin(movePhase) * MOVE_BOB_AMP * moving01`.
- Squash: `(1 - cos(movePhase))` scaled by `moving01`.
- **Start/stop jitter fix:** constant `MOVE_BOB_HZ` + phase accumulator (do not multiply `time` by a per-frame changing frequency).

**Footstep ticks:** `consumeStepTicks(movePhase, …)` in `lib/gameAudio.js` — one sound per **full bob cycle** (`STEP_PHASE_RADIANS = 2π`). Do not use `π` unless you intentionally want two ticks per bob.

---

## Remote players (`RemotePlayer.js`)

**Split:**

| Ref | Updated when | Purpose |
|-----|----------------|---------|
| `networkTarget` | `useEffect` on prop change | Latest Supabase position |
| `visualPosition` | `useFrame` + `lerpPosition` | Rendered mesh position |

`Game.js` `players` state is **network-only** — never bind mesh `position` directly to it.

**Tuning:** `REMOTE_POSITION_SMOOTH` in `lib/interpolation.js` (default `8`).

**Not done:** extrapolation between 5s syncs; faster local upsert rate.

---

## Camera (`FollowCamera.js`)

- World-space camera (not child of player mesh).
- Desired offset: above + behind player (`+Z`; W moves toward `-Z`).
- `camera.position.lerp(desired, smoothRate(POSITION_SMOOTH, delta))`.
- `camera.lookAt(player)` each frame.
- Canvas: `camera={{ position: [0, 2.5, 5], fov: 50 }}` — vertical FOV, slightly tighter than default 75.
- **No sinus sway** (removed — caused motion sickness). Project rule in `AGENTS.md`: cozy default = stable camera; prefer character bob + audio over oscillating view.

**Limitation:** offset is fixed in world space (no orbit / yaw-relative rig yet).

**Not planned by default:** continuous camera sway / head-bob on the view. Optional later: non-oscillating lag on accel/stop only.

---

## Audio

**Assets (`public/audio/`):**

| Path | Use |
|------|-----|
| `ambiances/abeto-base.ogg` | Looping ambience (fades in after unlock) |
| `player/footstep-wood.wav` | Reserved for surface zones (not wired yet) |
| `player/footstep-grass.wav` | Short one-shot; default wood surface (preferred) |
| `player/abeto-footsteps.ogg` | Long clip — **do not** use for per-step ticks; trim or ignore |

**Flow:**

1. `GameAudio` — first `keydown` or `pointerdown` calls `unlockGameAudio()` (browser autoplay policy).
2. `lib/gameAudio.js` — Web Audio API: decode buffers, loop ambience with gain ramp, `playFootstep()` one-shots.
3. `LocalPlayer` — each frame `consumeStepTicks(movePhase, lastStepIndexRef, moving01)` after advancing phase.

**Tuning (`lib/gameAudio.js`):**

| Constant | Role |
|----------|------|
| `FOOTSTEP_VOLUME` | One-shot level |
| `AMBIENCE_VOLUME` | Loop bed level |
| `MIN_MOVING_FOR_STEP` | `moving01` threshold: no steps below this; resets step index while idle/slow to avoid catch-up bursts on resume |
| `STEP_PHASE_RADIANS` | `2π` = one footstep per visual bob cycle |

**Note:** `ensureLoaded()` currently decodes `AUDIO.footstepGrass` into the active footstep buffer. Switch to `footstepWood` when wood is the default again. Surface-based switching = future work (zones + `footstepGrass`).

**Tab hidden:** `setAudioMuted(true)` suspends context and fades ambience out.

---

## Environment (`Environment.js`)

- Ground 100×100, fog + background `#252a37`, sun `#fcb57f`.
- Ambient (cool, low) + directional (warm, `castShadow`).
- `Game.js`: `<Canvas shadows>`; player meshes `castShadow` / `receiveShadow`.

---

## Environment props (GLB) — **in progress (station slice)**

First 3D environment work. Pattern: **`EnvironmentModel`** + URLs in **`lib/environmentModels.js`**.

### Loading pattern (`EnvironmentModel.js`)

- `useGLTF(url)` from `@react-three/drei` (cached per URL).
- `scene.clone(true)` per instance; meshes get `castShadow` / `receiveShadow`.
- Ground snap: subtract bounding-box `min.y` so the model sits on `y = 0`.
- Props: `position`, `rotation` (radians), `scale` (number or `[x,y,z]`).

### Assets (`public/images/environments/`)

| `ENV_MODELS` key | File | Role |
|------------------|------|------|
| `trainHead` | `train-electric-square-a.glb` | Locomotive (Kenney) |
| `trainCar` | `train-electric-square-b.glb` | Middle car |
| `trainTail` | `train-electric-square-c.glb` | Tail car |
| `railStraight` | `railroad-straight.glb` | Track tile |
| `railCrossing` | `railroad-crossing.glb` | Short crossing (unused in scene) |
| `railCrossingLong` | `railroad-crossing-long.glb` | Crossing decoration in scene |

### Station layout (`StationRailProps.js`)

Mounted from `Game.js` as:

```jsx
<StationRailProps start={[-15, 0, -7]} />
```

**Convention (fixed — do not reintroduce `axis` prop without reason):**

- Track runs along **world +X** (more `RAIL_COUNT` segments extend **right**).
- Segment `0` at `start`; segment `i` at `start.x + i * SEGMENT_LENGTH`.
- `SEGMENT_LENGTH = RAIL_SCALE * 2` (currently `RAIL_SCALE = 1.8`).
- **Train consist:** `TrainConsist` — head / car / tail; spacing via `TRAIN_CAR_SPACING` and `carIndex` in `TRAIN_PARTS` (negative indices used so cars sit correctly behind the head — retune there, not in three separate components).
- **Crossing:** `railCrossingLong` at `crossingPosition(start)` with small `CROSSING_SCALE` (0.02).

**Tuning lives at the top of `StationRailProps.js`:** `RAIL_COUNT`, `RAIL_SCALE`, `TRAIN_SCALE`, `TRAIN_CAR_SPACING`, `TRAIN_OFFSET`, rotations, `start` default.

**Not done:** spawn point at platform, platform mesh, konbini, animated crossing gates, surface footstep zones.

---

## Handoff — continue here (next session)

**State:** Station rail MVP looks good as a starting point (track + 3-car electric square train + long crossing). Player still spawns at `(0, 0.5, 0)` — walk **D (+X)** and toward **−Z** to reach `start={[-15, 0, -7]}`.

**Recommended order (one PR each):**

1. **Spawn near the train** — set initial `myPositionRef` in `Game.js` beside the consist (e.g. offset from `start`); optional simple platform/plane under rails.
2. **One landmark prop** — konbini or shelter via `<EnvironmentModel />` + new entry in `environmentModels.js` (Kenney Mini Market or similar).
3. **Surface footsteps** — box zone on platform/track → `footstep-wood.wav`; grass elsewhere (`lib/gameAudio.js` already has both files).
4. **Quiet station ambience** — under existing bed; avoid stacking loud loops.

**Defer:** animated crossing, character model, extra biomes, social UI, faster multiplayer sync.

**Removed:** `lib/trackLayout.js` (layout simplified to +X-only + `start` prop).

---

## Next steps (backlog)

**Done (2026-05-20):** local bob/squash, stable camera, ambience + footstep rhythm, cozy-camera rules in `AGENTS.md`.

**Done (2026-05-21):** GLB pipeline (`EnvironmentModel`), station rail slice (`StationRailProps`), Kenney track + electric-square consist + crossing-long; tuned scales/positions.

**Still open:**

- Finish station slice (spawn, platform, konbini) — see Handoff above.
- Surface footsteps, slow-walk polish, station SFX.
- Social UI (chat/diary), character/emotes, remote extrapolation (optional).
- Ambient motion, shadow polish (low priority).


---

## Commands

```bash
npm run dev
npm run build
```

---

## Changelog (doc)

- **2026-05-21 — Station environment slice (first GLBs):**
  - `EnvironmentModel.js`, `lib/environmentModels.js`, `StationRailProps.js`.
  - Kenney: straight rails along +X, `train-electric-square` a/b/c as head/car/tail consist, `railroad-crossing-long` decoration.
  - `Game.js`: `<StationRailProps start={[-15, 0, -7]} />` (tuned layout).
  - Layout API: only `start` prop; rotations/scales as file-level constants.
- **2026-05-20 — Feel + audio session:**
  - `LocalPlayer`: idle/move bob, squash/stretch, continuous `movePhase`, `moving01` intensity smoothing; footstep phase hooks.
  - `FollowCamera`: removed sinus sway (comfort); stable lerp follow only.
  - `lib/gameAudio.js` + `component/GameAudio.js`: Web Audio unlock, looping `abeto-base.ogg`, one-shot footsteps; step ticks at `2π` phase (tuned from `π` — was 2× too fast vs bob).
  - `Game.js`: mounts `<GameAudio />`; `SYNC_MS` documented as `5000`.
  - `AGENTS.md`: cozy camera comfort rules; agents should challenge motion-sickness / non-cozy camera tricks.
  - Assets added under `public/audio/` (see Audio section). `abeto-footsteps.ogg` is not used for ticks.
- **Earlier:** Follow camera, camera-relative movement (accel/decel, turn cap), environment (fog/shadows), remote interpolation (`RemotePlayer` + `lib/interpolation.js`). Removed `Player.js`.
- Multiplayer: Supabase upsert + realtime; `last_seen` heartbeat; client prune; no DELETE.
