/**
 * Modular chibi parts — hair, face, outfit (style + color axes).
 */

export const FACE_PARTS = {
  normal: {
    label: "Normal",
    variant: "normal",
    width: 0.44,
    height: 0.44,
    /** Offset in meters from head bone in head-local axes (+Z = out the face). */
    offset: [0, 0.15, 0.27],
    rotation: [0, 0, 0],
  },
  smile: {
    label: "Smile",
    variant: "smile",
    width: 0.44,
    height: 0.44,
    offset: [0, 0.15, 0.27],
    rotation: [0, 0, 0],
  },
};

export const FACE_KEYS = Object.keys(FACE_PARTS);

/** Hair styles (mesh only — color comes from HAIR_COLORS). */
export const HAIR_PARTS = {
  boy: {
    label: "Boy",
    url: "/images/characters/hair/hair-boy-2.glb",
    meshName: "Hair_Boy_2",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  girl: {
    label: "Girl",
    url: "/images/characters/hair/hair-girl-1.glb",
    meshName: "Hair_Girl_1",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
};

export const HAIR_KEYS = Object.keys(HAIR_PARTS);

/** Cozy ACNH-common hair colors (max 8 for MVP). */
export const HAIR_COLORS = {
  black: { label: "Black", color: "#2b2622" },
  darkBrown: { label: "Dark Brown", color: "#4d3321" },
  brown: { label: "Brown", color: "#7a5230" },
  auburn: { label: "Auburn", color: "#93502f" },
  blonde: { label: "Blonde", color: "#d9b06a" },
  ash: { label: "Ash", color: "#9a958c" },
  silver: { label: "Silver", color: "#e6e2da" },
  pink: { label: "Pink", color: "#e6a4b4" },
};

export const HAIR_COLOR_KEYS = Object.keys(HAIR_COLORS);

/** Outfit styles (mesh only — color comes from OUTFIT_COLORS). */
export const OUTFIT_PARTS = {
  tee: {
    label: "Tee",
    url: "/images/characters/outfit/tshirt.glb",
    meshName: "tshirt",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
};

export const OUTFIT_KEYS = Object.keys(OUTFIT_PARTS);

/** Cozy ACNH-common outfit colors (max 8 for MVP). */
export const OUTFIT_COLORS = {
  cream: { label: "Cream", color: "#f0ece4" },
  white: { label: "White", color: "#ffffff" },
  sky: { label: "Sky", color: "#6b9bd1" },
  yellow: { label: "Yellow", color: "#ffda03" },
  sage: { label: "Sage", color: "#9bb08a" },
  dustyPink: { label: "Dusty Pink", color: "#e0a3a0" },
  lavender: { label: "Lavender", color: "#b3a3d6" },
  terracotta: { label: "Terracotta", color: "#c9744f" },
};

export const OUTFIT_COLOR_KEYS = Object.keys(OUTFIT_COLORS);

export const DEFAULT_APPEARANCE = {
  hair: "boy",
  hairColor: "darkBrown",
  face: "normal",
  outfit: "tee",
  outfitColor: "yellow",
};

export function resolveHairPart(hairKey) {
  return HAIR_PARTS[hairKey] ?? HAIR_PARTS[DEFAULT_APPEARANCE.hair];
}

export function resolveFacePart(faceKey) {
  return FACE_PARTS[faceKey] ?? FACE_PARTS[DEFAULT_APPEARANCE.face];
}

export function resolveOutfitPart(outfitKey) {
  return OUTFIT_PARTS[outfitKey] ?? OUTFIT_PARTS[DEFAULT_APPEARANCE.outfit];
}

export function resolveHairColor(hairColorKey) {
  return (
    HAIR_COLORS[hairColorKey]?.color ??
    HAIR_COLORS[DEFAULT_APPEARANCE.hairColor].color
  );
}

export function resolveOutfitColor(outfitColorKey) {
  return (
    OUTFIT_COLORS[outfitColorKey]?.color ??
    OUTFIT_COLORS[DEFAULT_APPEARANCE.outfitColor].color
  );
}
