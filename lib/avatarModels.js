/**
 * Logged-in chibi player base — separate from guest cat registry (`playerModels.js`).
 */

export const CHIBI_BASE_MODEL = {
  url: "/images/characters/player-base.glb",
  label: "Chibi base",
  scale: 1.5,
  rotation: [0, Math.PI, 0],
  animated: true,
  toon: true,
  toonTint: "#fff6ee",
  footYOffset: -0.33,
  headBoneName: "mixamorigHead",
  idleClip: "idle",
  walkClip: "run",
};
