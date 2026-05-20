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
component/GameAudio.js      → unlock Web Audio on first key/pointer; tab mute
lib/supabase.js             → Supabase client
lib/interpolation.js        → smoothRate, lerpPosition (remotes; reusable)
lib/gameAudio.js            → ambience loop, one-shot footsteps, step phase ticks
public/audio/               → see Audio section
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

## Next steps (suggested)

**Done (2026-05-20 session):** local bob/squash, stable camera (no sway), ambience + footstep rhythm synced to bob (`2π` step phase), `AGENTS.md` cozy-camera + “challenge cozy trade-offs” agent rules.

**Recommended next (pick one PR-sized feature):**

1. **One environment slice** — station / riverside / rooftop / minimarket (`AGENTS.md` MVP). Highest “feels like a game” payoff.
2. **Surface footsteps** — zones on ground → `footstep-grass.wav` vs `footstep-wood.wav`.
3. **Slow-walk polish** — scale `movePhase` advance by `moving01` so bob + steps slow when barely moving.
4. **Extra ambience** — rain or station SFX (keep one bed + footsteps; avoid muddy mix).
5. **Social UI** — chat bubble or diary (needs Supabase design).

**Still open from earlier list:**

- Ambient motion (particles, soft light drift) — after a place exists.
- Character model / emotes — replace cubes.
- Remote extrapolation or faster sync if remotes feel jumpy at 5s (optional).
- Shadow tuning, subtle idle tilt (low priority).


---

## Commands

```bash
npm run dev
npm run build
```

---

## Changelog (doc)

- **2026-05-20 — Feel + audio session:**
  - `LocalPlayer`: idle/move bob, squash/stretch, continuous `movePhase`, `moving01` intensity smoothing; footstep phase hooks.
  - `FollowCamera`: removed sinus sway (comfort); stable lerp follow only.
  - `lib/gameAudio.js` + `component/GameAudio.js`: Web Audio unlock, looping `abeto-base.ogg`, one-shot footsteps; step ticks at `2π` phase (tuned from `π` — was 2× too fast vs bob).
  - `Game.js`: mounts `<GameAudio />`; `SYNC_MS` documented as `5000`.
  - `AGENTS.md`: cozy camera comfort rules; agents should challenge motion-sickness / non-cozy camera tricks.
  - Assets added under `public/audio/` (see Audio section). `abeto-footsteps.ogg` is not used for ticks.
- **Earlier:** Follow camera, camera-relative movement (accel/decel, turn cap), environment (fog/shadows), remote interpolation (`RemotePlayer` + `lib/interpolation.js`). Removed `Player.js`.
- Multiplayer: Supabase upsert + realtime; `last_seen` heartbeat; client prune; no DELETE.
