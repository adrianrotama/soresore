import { supabase } from "@/lib/supabase";
import { normalizeAppearance } from "@/lib/appearanceStorage";

const DISPLAY_NAME_KEY = "soresore.displayName";

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

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

/** Google (or any non-anonymous provider) — not an ephemeral guest cat. */
export function hasPermanentIdentity(user) {
  if (!user) return false;
  if (
    user.identities?.some(
      (identity) => identity.provider && identity.provider !== "anonymous"
    )
  ) {
    return true;
  }
  return !user.is_anonymous;
}

export function isAnonymousUser(user) {
  return Boolean(user && !hasPermanentIdentity(user));
}

export function isLoggedInUser(user) {
  return hasPermanentIdentity(user);
}

export function validateDisplayName(name) {
  const trimmed = name.trim();
  if (trimmed.length < DISPLAY_NAME_MIN) return "too_short";
  if (trimmed.length > DISPLAY_NAME_MAX) return "too_long";
  if (!DISPLAY_NAME_PATTERN.test(trimmed)) return "invalid_chars";
  return null;
}

/**
 * Complete OAuth redirect — PKCE ?code= or implicit #access_token= in hash.
 * Safe to call on / or /auth/callback. Strips auth params from the URL after success.
 */
function stripAuthFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.hash = "";
  const nextPath = `${url.pathname}${url.search}`;
  window.history.replaceState({}, "", nextPath);
}

export async function finishAuthFromUrl() {
  if (typeof window === "undefined") return { ok: true };

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { ok: false, error: error.message };
    }
    stripAuthFromUrl();
    return { ok: true };
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        return { ok: false, error: error.message };
      }
      stripAuthFromUrl();
      return { ok: true };
    }
  }

  return { ok: true };
}

/** Current tab session, or `{ kind: "none" }` when signed out. */
export async function getAuthState() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { kind: "none" };
  }

  if (hasPermanentIdentity(session.user)) {
    return { kind: "logged_in", userId: session.user.id, user: session.user };
  }

  return { kind: "guest", userId: session.user.id, user: session.user };
}

/** Guest cats are ephemeral — clear anonymous-only session on refresh. */
export async function clearEphemeralGuestSession() {
  const auth = await getAuthState();
  if (auth.kind === "guest") {
    await supabase.auth.signOut();
  }
}

export async function signInAsGuest() {
  const auth = await getAuthState();

  if (auth.kind === "guest") {
    return auth.userId;
  }

  if (auth.kind === "logged_in") {
    await supabase.auth.signOut();
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}

export async function signInWithGoogle() {
  const auth = await getAuthState();
  if (auth.kind === "guest") {
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function getPlayerProfile(userId) {
  const { data, error } = await supabase
    .from("players")
    .select("display_name, appearance")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function savePlayerAppearance(userId, appearance) {
  const normalized = normalizeAppearance(appearance);
  const { error } = await supabase
    .from("players")
    .update({ appearance: normalized })
    .eq("id", userId);

  if (error) throw error;
  return normalized;
}

/**
 * Claim a unique display name (one-time). Returns `{ ok, displayName?, error? }`.
 */
export async function claimDisplayName(userId, name, position) {
  const trimmed = name.trim();
  const validation = validateDisplayName(trimmed);
  if (validation) {
    return { ok: false, error: validation };
  }

  const { error } = await supabase.from("players").upsert({
    id: userId,
    display_name: trimmed,
    x: position?.x ?? 0,
    y: position?.y ?? 1.5,
    z: position?.z ?? 16,
    last_seen: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "taken" };
    }
    return { ok: false, error: "unknown", message: error.message };
  }

  setDisplayName(trimmed);
  return { ok: true, displayName: trimmed };
}
