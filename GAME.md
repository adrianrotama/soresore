# Soresore — Game architecture & context

> **For AI agents:** Read this before changing multiplayer, movement, or camera code. Visual/MVP direction lives in `AGENTS.md`. Next.js APIs may differ from training data — check `node_modules/next/dist/docs/` when touching app routing or config.

---

## What this is

A **browser-based multiplayer 3D world** (early prototype). Each tab is one player. Positions sync through **Supabase**; other players appear as cubes. Goal long-term: cozy low-poly “world” (see `AGENTS.md`), not a debug scene.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Backend | Supabase (Postgres + Realtime) |
| Styles | SCSS (`app/globals.scss`, CSS modules) |

Env (`.env`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## File map

```
app/page.js              → mounts <Game /> in full-viewport canvas container
component/Game.js        → Canvas, Supabase sync, remote player list, ground plane
component/LocalPlayer.js → local movement (must be child of <Canvas>)
component/Player.js      → remote player mesh (box)
lib/supabase.js          → Supabase client singleton
```

---

## Mental model (per browser tab)

```
1. Generate unique playerId (crypto.randomUUID(), stable for tab lifetime)
2. Move locally every frame (LocalPlayer + useFrame)
3. Heartbeat to Supabase every SYNC_MS (upsert position + last_seen)
4. Subscribe to postgres_changes on `players` table (realtime)
5. Keep local `players` state; render remote cubes from that state
6. Hide “gone” players via last_seen (client prune) — no server DELETE
```

```
┌─────────────┐     upsert (5s)      ┌──────────────┐
│  Tab A      │ ──────────────────► │   Supabase   │
│  LocalPlayer│ ◄── realtime ────── │   players    │
└─────────────┘                     └──────────────┘
       ▲                                    │
       │         postgres_changes           │
       └──────────── Tab B, C, … ───────────┘
```

---

## Supabase: `players` table

Expected columns:

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid (PK) | Client-generated per tab |
| `x`, `y`, `z` | float | World position; local player starts `y: 0.5` |
| `last_seen` | timestamptz | Heartbeat timestamp |

**Dashboard setup:**

- Enable **Realtime** for `players` (Database → Replication).
- RLS: anon can `SELECT` + `INSERT`/`UPDATE` (upsert). **DELETE is intentionally not used** — client cleanup only.

**`players-room` channel:** Not a dashboard object. Arbitrary client-side name for `supabase.channel("players-room").on("postgres_changes", …)`. Listens to row changes on the `players` table.

---

## Timing constants (`Game.js`)

| Constant | Value | Role |
|----------|-------|------|
| `SYNC_MS` | 5000 | How often local tab upserts position + `last_seen` |
| `STALE_MS` | 15000 | Hide player if `last_seen` older than this (`> SYNC_MS`) |
| `PRUNE_MS` | 2000 | Interval to sweep local state and remove stale entries |

**Prune** = remove stale ids from **in-memory** `players` state only. Does not delete DB rows. Needed because tab-close DELETE does not work / was removed; time-based heartbeat is the source of “who is online” for the UI.

Stale filtering happens at:

1. Initial load (`select` → skip stale rows)
2. Realtime handler (ignore or remove stale updates)
3. `pruneStalePlayers()` on interval
4. `remotePlayers` render filter

---

## Movement (`LocalPlayer.js`)

- **Input:** WASD + arrow keys (window `keydown` / `keyup`).
- **Loop:** `useFrame` from `@react-three/fiber` — **must run inside `<Canvas>`**, not in `Game.js`.
- **Speed:** fixed `SPEED = 0.05` per frame — **not delta-time aware** (movement speed varies with FPS).
- **State:** position in `positionRef` (mutable object); mesh updated via `meshRef.current.position.set()` to avoid re-rendering every frame.
- **Visual:** hotpink box = local player.

Remote players (`Player.js`): skyblue box, position from React state (updates on sync interval, can feel jumpy).

---

## Camera & scene (current — debug-like)

- Fixed initial camera: `position: [2, 5, 10]`.
- **`OrbitControls`** from drei — free orbit, not game-like.
- Ground: 20×20 gray plane.
- Lighting: ambient only (`intensity: 1`).

This is why it feels like a tech demo, not a world.

---

## Important implementation gotchas

1. **`useFrame` is from `@react-three/fiber`, not `react`.** Only works under `<Canvas>`.
2. **Local vs remote split:** Local player is NOT in `players` state; rendered by `<LocalPlayer />`. Remotes filtered with `id !== playerId`.
3. **Do not rely on Supabase DELETE** for leave/disconnect; use `last_seen` + prune.
4. **Realtime `event: "*"`** still subscribed; DELETE handler was removed — ghosts handled by heartbeat only.
5. **Next.js 16** — follow project `AGENTS.md` / `node_modules/next/dist/docs/` for framework quirks.

---

## Visual direction (from `AGENTS.md`)

Target aesthetic: low poly, cozy, evening orange–blue (`#fcb57f`, `#252a37`), chibi proportions, minimal texture. MVP areas: station, riverside, rooftop, minimarket. Moodboard refs under `public/images/moodboard/`.

---

## Next goal: “a world”, not a tech demo

### Problems now

- OrbitControls → editor/debug feel, not player embodiment
- Instant per-frame movement (no acceleration / smoothing)
- Remote players snap on 5s sync
- Flat lighting, placeholder geometry
- No follow camera

### Desired direction

| Need | Direction |
|------|-----------|
| Follow camera | Third-person rig behind/above local player |
| Smoother movement | Acceleration, maybe camera-relative WASD |
| Grounded feel | Better ground scale, shadows, environment blocks |
| Smooth camera | Lerp camera position/look-at each frame |

### Concepts to apply (learning targets)

| Concept | What it means here |
|---------|-------------------|
| **Camera rig** | Empty `THREE.Group` or dedicated object: player at origin, camera offset (e.g. behind + up). Move rig with player; camera stays in local offset space. |
| **Lerping** | `current += (target - current) * alpha` each frame for camera and optionally remote player positions. Use small `alpha` (0.05–0.15) or `1 - Math.exp(-k * delta)`. |
| **Game feel** | Acceleration/deceleration, slight bob, FOV, input buffering — movement should weight, not teleport. |
| **Delta time** | `useFrame((state, delta) => …)` — multiply speed by `delta` so motion is **units per second**, not per frame. Essential before tuning `SPEED`. |

### Suggested implementation order (for next agent)

1. Remove `OrbitControls`; add follow camera component using `useFrame` + lerp toward `positionRef`.
2. Refactor `LocalPlayer` movement to use `delta` and optional velocity lerp.
3. Lerp remote `Player` positions toward network target in `useFrame`.
4. Replace placeholder scene pieces incrementally per `AGENTS.md` art direction.

### Camera sketch (third person)

```
Player mesh
    ↑
Camera rig (group at player x,y,z)
    └── camera offset (0, height, -distance) in rig local space
useFrame: rig.position.lerp(playerPos); camera lerps to look at player chest
```

---

## Commands

```bash
npm run dev    # local dev
npm run build  # production build
```

---

## Changelog (doc)

- Multiplayer via Supabase upsert + realtime; heartbeat `last_seen`; client prune; no DELETE.
- Local movement in `LocalPlayer`; `useFrame` fix documented above.
