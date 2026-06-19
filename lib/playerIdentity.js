import { supabase } from "@/lib/supabase";

const DISPLAY_NAME_KEY = "soresore.displayName";

function defaultDisplayName(userId) {
  return `Guest-${userId.slice(0, 4)}`;
}

export function getDisplayName(userId) {
  if (typeof window === "undefined") return defaultDisplayName(userId);
  const saved = window.sessionStorage.getItem(DISPLAY_NAME_KEY);
  if (saved?.trim()) return saved.trim();
  return defaultDisplayName(userId);
}

export function setDisplayName(name) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    window.sessionStorage.setItem(DISPLAY_NAME_KEY, trimmed);
  } else {
    window.sessionStorage.removeItem(DISPLAY_NAME_KEY);
  }
}

/**
 * Ensure an anonymous Supabase auth session exists for this tab.
 * Returns auth uid used as players.id and message sender_id.
 */
export async function ensureAnonymousSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const userId = session.user.id;
    return { userId, displayName: getDisplayName(userId) };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  const userId = data.user.id;
  return { userId, displayName: getDisplayName(userId) };
}
