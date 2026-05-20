<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Visual Rule
Environment
always sunset
low-poly
rounded edges
low texture noise
muted palette
no realistic shaders
no sharp black shadows

UI
CRT inspired
Persona-like transitions
translucent
Lighting
always evening
orange-blue contrast ( #fcb57f, #252a37)

Character
chibi/simple proportions


# Asset Sources
https://kenney.nl/assets
https://itch.io/game-assets/free
https://poly.pizza/?utm_source
https://sketchfab.com/features/free-3d-models

keywords:
low poly
cozy
stylized

# MVP
Environment
1 station area
1 riverside
1 rooftop
1 minimarket

Avatar
2-3 hairstyle
simple clothes
4 emotes:
wave
sit
happy
sleepy

UI
login screen
diary popup
friend popup
chat bubble
profile card

Audio
1 ambient track
rain SFX
station ambience
footsteps

---

## Cozy camera comfort (design rule)

- **Default camera**: keep it **stable**. Cozy games (e.g. Nintendo-style) typically rely on **smooth follow** and **character animation cadence** (bob/steps), not continuous oscillating camera sway.
- **Avoid oscillation by default**: sinus sway can cause **motion sickness** even at small amplitudes, especially when it starts/stops with input.
- **If adding camera effects**: prefer **non-oscillating** secondary motion (gentle lag on acceleration/stop, subtle settle), and keep it optional/tiny.

## Agent behavior (project rule)

- **Don’t just agree**: when a request impacts comfort, clarity, or “cozy” feel, **challenge it with trade-offs** and recommend what famous cozy games typically do.
- **Bias**: comfort-first and readable motion; “cozy” comes from easing, rhythm, and atmosphere more than camera tricks.

<!-- END:nextjs-agent-rules -->
