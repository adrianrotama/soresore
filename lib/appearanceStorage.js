/**
 * Local persistence for the chibi `appearance` (Phase C3).
 * localStorage only; Supabase `players.appearance` is Phase D2.
 */

import {
  DEFAULT_APPEARANCE,
  FACE_KEYS,
  HAIR_COLOR_KEYS,
  HAIR_KEYS,
  OUTFIT_COLOR_KEYS,
  OUTFIT_KEYS,
} from "@/lib/avatarParts";

const STORAGE_KEY = "soresore.appearance";

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** Coerce any stored/partial object into a valid appearance. */
export function normalizeAppearance(raw) {
  const a = raw && typeof raw === "object" ? raw : {};
  return {
    hair: pick(a.hair, HAIR_KEYS, DEFAULT_APPEARANCE.hair),
    hairColor: pick(a.hairColor, HAIR_COLOR_KEYS, DEFAULT_APPEARANCE.hairColor),
    face: pick(a.face, FACE_KEYS, DEFAULT_APPEARANCE.face),
    outfit: pick(a.outfit, OUTFIT_KEYS, DEFAULT_APPEARANCE.outfit),
    outfitColor: pick(
      a.outfitColor,
      OUTFIT_COLOR_KEYS,
      DEFAULT_APPEARANCE.outfitColor
    ),
  };
}

/** Returns a valid appearance from storage, or DEFAULT_APPEARANCE. */
export function loadAppearance() {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_APPEARANCE };
    return normalizeAppearance(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(appearance) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeAppearance(appearance))
    );
  } catch {
    // ignore quota / privacy-mode write failures
  }
}

/** True once the player has confirmed a look at least once. */
export function hasCreatedCharacter() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
