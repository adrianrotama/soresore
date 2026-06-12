/**
 * Guest cat model (Quaternius).
 * Logged-in chibi avatar uses lib/avatarParts.js + ChibiAvatar.
 */

export const PLAYER_CAT_MODELS = {
  quaternius: {
    url: "/images/characters/Cat-Quarternius.glb",
    label: "Quaternius",
    scale: 0.6,
    rotation: [0, -Math.PI, 0],
    animated: true,
    paletteRecolor: true,
    toon: true,
    toonTint: "#fff6ee",
    footYOffset: -0.8,
  },
};

export const PLAYER_CAT_KEYS = Object.keys(PLAYER_CAT_MODELS);

export const DEFAULT_PLAYER_CAT = "quaternius";
