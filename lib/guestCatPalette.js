/**
 * Guest cat color presets for Quaternius (UV palette columns).
 * Each guest picks one set deterministically from their player id.
 */

/** @typedef {{ name: string, body: string, bodyAccent: string, eye: string, nose: string }} GuestCatPalette */

/** @type {GuestCatPalette[]} */
export const GUEST_CAT_PRESETS = [
  {
    name: "Ginger",
    body: "#c47a3a",
    bodyAccent: "#e8a060",
    eye: "#3d6b35",
    nose: "#f0a8a8",
  },
  {
    name: "Snowshoe",
    body: "#d8d8e8",
    bodyAccent: "#4a4a5a",
    eye: "#5a9a48",
    nose: "#c89090",
  },
  {
    name: "Charcoal",
    body: "#5a5a62",
    bodyAccent: "#888898",
    eye: "#c8d850",
    nose: "#3a3a3a",
  },
  {
    name: "Cream",
    body: "#f0e0c8",
    bodyAccent: "#d8c0a0",
    eye: "#4a7a40",
    nose: "#e8b0b0",
  },
  {
    name: "Tuxedo",
    body: "#2a2a32",
    bodyAccent: "#f2f2f8",
    eye: "#4fc4db",
    nose: "#1a1a22",
  },
  {
    name: "Bluepoint",
    body: "#a8b8c8",
    bodyAccent: "#7888a0",
    eye: "#4a7a40",
    nose: "#a07080",
  },
  {
    name: "Cinnamon",
    body: "#a06038",
    bodyAccent: "#c88850",
    eye: "#52422f",
    nose: "#d89088",
  },
  {
    name: "Lilac",
    body: "#b0a0b8",
    bodyAccent: "#9080a0",
    eye: "#5da154",
    nose: "#b08090",
  },
];

/** Quaternius cat UV columns → palette slot (see atlas layout). */
export function quaterniusZoneForUV(u, v) {
  const uKey = u.toFixed(2);
  const vKey = v.toFixed(2);
  if (uKey === "0.53" && vKey === "0.84") return "nose";
  if (uKey === "0.59" && vKey === "0.84") return "eye";
  if (uKey === "0.46" && vKey === "0.85") return "bodyAccent";
  return "body";
}

export function hashString(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function presetIndexFromSeed(seed) {
  return hashString(String(seed)) % GUEST_CAT_PRESETS.length;
}

/** Stable palette for a guest session (local) or remote player id. */
export function paletteFromSeed(seed) {
  return GUEST_CAT_PRESETS[presetIndexFromSeed(seed)];
}
