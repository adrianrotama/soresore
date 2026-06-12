# Blender fit tutorial — chibi hair & shirt (Mac)

Register finished GLBs in `lib/avatarParts.js`. Test in game with dev key **`4`** (chibi) and **`7`** (outfit).

**Install:** [blender.org](https://www.blender.org/download/) → drag Blender to Applications.

## Mac shortcuts

| Action | Shortcut |
|--------|----------|
| Orbit | Middle-click drag (or **Option + drag**) |
| Pan | **Shift + middle-click drag** |
| Zoom | Scroll or **Cmd + scroll** |
| Grab / Rotate / Scale | **G** / **R** / **S** |
| Confirm / Cancel | **Return** / **Esc** |
| Delete | **X** → Delete |

## One-time reference setup

1. **File → New → General**
2. **File → Import → glTF 2.0** → `public/images/characters/player-base.glb`
3. Set **Clip End** to `100` if the model clips (N panel → Viewport).
4. **File → Save As** → `soresore-avatar-ref.blend`

## Hair — fit mesh to head

1. Import hair GLB/FBX. Delete any body/armature — **hair mesh only**.
2. Scale (**S**) until hair wraps the head (~0.5 m wide; top Y ≈ 1.0–1.5 m, feet at 0).
3. Optional **Shrinkwrap** modifier → target body mesh, offset `0.01`, Apply.
4. Edit Mode → Merge by Distance. Set origin to geometry.
5. Export **Selected Objects** as GLB (+Y Up) → `public/images/characters/hair/`.
6. Register in `HAIR_PARTS` (`url`, `meshName`). Tune `offset` / `rotation` in registry if needed.

## Shirt — skinned (Option C)

1. Open reference blend with `player-base.glb` (body + armature).
2. Import shirt; delete body/legs/arms — **shirt mesh only**.
3. Scale/move to cover torso. Shrinkwrap with offset `0.005–0.02`.
4. **Ctrl+P** → Armature Deform → Transfer Weights (or Automatic Weights). Test in Pose mode.
5. Export **shirt mesh + armature** with Skinning + Armature → `public/images/characters/outfit/tshirt.glb`.
6. Register in `OUTFIT_PARTS` (style) + `OUTFIT_COLORS` (tints).

## Export checklist

**Hair:** mesh only, transforms applied, file in `hair/`.

**Shirt:** mesh + armature, skinning enabled, no body mesh, re-import to verify deformation, file in `outfit/`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Model tiny / huge | **S** then type `50` or `0.01` |
| Hair floats in game | Re-export; tune `offset` in `avatarParts.js` |
| Shirt sleeves stuck in T-pose | Re-export shirt **+ armature** with Skinning on |
| GLB missing weights | Export included mesh only, not armature |
| Pink mesh in game | Ensure GLB has a material (game converts to toon) |
