/**
 * Modular chibi parts — hair, face, outfit.
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

export const HAIR_PARTS = {
  boy: {
    label: "Boy",
    url: "/images/characters/hair/hair-boy-2.glb",
    meshName: "Hair_Boy",
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

export const OUTFIT_PARTS = {
  white: {
    label: "White tee",
    url: "/images/characters/outfit/tshirt.glb",
    meshName: "tshirt",
    color: "#f0ece4",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  blue: {
    label: "Blue tee",
    url: "/images/characters/outfit/tshirt.glb",
    meshName: "tshirt",
    color: "#6b9bd1",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  yellow: {
    label: "Yellow tee",
    url: "/images/characters/outfit/tshirt.glb",
    meshName: "tshirt",
    color: "#ffda03",
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
  },
};

export const OUTFIT_KEYS = Object.keys(OUTFIT_PARTS);

export const DEFAULT_APPEARANCE = {
  hair: "boy",
  face: "normal",
  outfit: "yellow",
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
