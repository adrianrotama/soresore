# Supabase dashboard setup

Manual steps that **cannot** be captured in SQL. Pair with [`supabase-setup.sql`](supabase-setup.sql) when recreating a project.

## 1. Create project

1. [supabase.com](https://supabase.com) → New project.
2. Copy **Project URL** and **anon public** key → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 2. SQL schema

**SQL Editor** → paste and run [`supabase-setup.sql`](supabase-setup.sql).

## 3. Authentication

**Authentication → Providers**

| Setting | Value |
|---------|--------|
| Anonymous sign-ins | **Enabled** (guest cats) |
| Google | **Enabled** — Client ID + Secret from Google Cloud |

**Authentication → URL configuration**

| Field | Local dev |
|-------|-----------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |

### Google Cloud Console

**APIs & Services → Credentials → OAuth 2.0 Client (Web)**

| Field | Value |
|-------|--------|
| Authorized JavaScript origins | `http://localhost:3000`, `https://YOUR_REF.supabase.co` |
| Authorized redirect URIs | `https://YOUR_REF.supabase.co/auth/v1/callback` |

Do **not** put `http://localhost:3000/auth/callback` in Google — that URL belongs in Supabase Redirect URLs only.

**OAuth consent screen:** add your Google account as a **Test user** while app is in Testing mode.

## 4. Realtime

**Database → Publications → `supabase_realtime`**

Add tables: `players`, `messages`.

## 5. Smoke test

1. Two browser tabs → Tab A: Google sign-in → name → chibi. Tab B: Continue as guest.
2. Both avatars visible; chat works; name tags show on Google user.

## Disaster recovery checklist

- [ ] Run `docs/supabase-setup.sql` on new project
- [ ] Re-enable Anonymous + Google auth
- [ ] Set redirect URLs (local + production)
- [ ] Re-create Google OAuth client or update redirect URI to new project ref
- [ ] Add `players` + `messages` to Realtime publication
- [ ] Update `.env.local` (and production env) with new URL + anon key
