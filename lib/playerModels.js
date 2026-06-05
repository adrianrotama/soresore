/**
 * Guest cat prototypes — swap in dev with `3` to compare fit.
 * Logged-in chibi avatar will use a separate registry later.
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
  tubbs: {
    url: "/images/characters/Tubbs-the-cat.glb",
    label: "Tubbs",
    scale: 2,
    rotation: [0, 0, 0],
    animated: false,
    footYOffset: -0.3,
  },
};

export const PLAYER_CAT_KEYS = Object.keys(PLAYER_CAT_MODELS);

export const DEFAULT_PLAYER_CAT = "quaternius";
