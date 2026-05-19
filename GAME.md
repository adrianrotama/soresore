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
component/Game.js           → Canvas, Supabase sync, mounts systems
component/LocalPlayer.js    → local input, movement, rotation (useFrame)
component/RemotePlayer.js   → remote mesh; network vs visual position
component/FollowCamera.js     → third-person follow (not parented to player)
component/Environment.js    → ground, fog, lights, shadows
lib/supabase.js             → Supabase client
lib/interpolation.js        → smoothRate, lerpPosition (remotes; reusable)
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

**Limitation:** offset is fixed in world space (no orbit / yaw-relative rig yet).

---

## Environment (`Environment.js`)

- Ground 100×100, fog + background `#252a37`, sun `#fcb57f`.
- Ambient (cool, low) + directional (warm, `castShadow`).
- `Game.js`: `<Canvas shadows>`; player meshes `castShadow` / `receiveShadow`.

---

## Next steps (suggested)

1. Contact Feedback. Movement lack of footstep rhythm, bounce, squash, camera sway, shadow tightening, subtle vertical motion. Need tiny “physical lies”.
2. Ambient Motion. drifting particles, swaying lights, animated fog, floating dust, distant moving cubes, scrolling sky gradient.
3. Audio. soft wind, low ambient hum, footstep ticks, distant train ambience, UI hover sounds
4. Character models / animations; replace placeholder boxes.
5. Add Camera Secondary Motion.
Very subtle:
-movement sway
-slight lag
-breathing idle
-acceleration tilt
Tiny values only.
This makes camera feel attached to mass.
6. Add Idle Animation To Player. subtle bob, hover, tilt while moving
7. Add Footstep Rhythm. 
Doesn’t need real footsteps. tiny bounce, soft tick sound, rhythmic camera motion. creates grounding.


---

## Commands

```bash
npm run dev
npm run build
```

---

## Changelog (doc)

- **Session:** Follow camera, camera-relative movement (accel/decel, turn cap), environment (fog/shadows), remote interpolation (`RemotePlayer` + `lib/interpolation.js`). Removed `Player.js`.
- Multiplayer: Supabase upsert + realtime; `last_seen` heartbeat; client prune; no DELETE.
