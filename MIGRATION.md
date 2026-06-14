# BairePorbo — Supabase → Clerk + Neon + R2 Migration

**Date:** June 14, 2026  
**Status:** ✅ Complete and live at baireporbo.app  
**Scope:** Full replacement of Supabase (auth, database, storage) with Clerk, Neon, and Cloudflare R2.

---

## What Changed

| Before | After |
|--------|-------|
| Supabase Auth (email + Google OAuth) | Clerk (email + Google OAuth) |
| Supabase PostgreSQL | Neon PostgreSQL (Postgres 18, pgvector) |
| Supabase Storage | Cloudflare R2 (`cdn.baireporbo.app`) |

---

## Architecture Overview

```
Browser / Next.js App
  ├── Auth:     Clerk  (ClerkProvider, clerkMiddleware, useUser, auth())
  ├── Database: Neon   (@neondatabase/serverless, raw SQL via tagged templates)
  └── Storage:  R2     (@aws-sdk/client-s3, S3-compatible API)
```

---

## Code Changes

### 1. Auth — Clerk

**Deleted:**
- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`

**Modified:**
- `src/proxy.ts` — replaced Supabase session refresh with `clerkMiddleware()`
- `src/app/providers.tsx` — wrapped app in `<ClerkProvider>`
- `src/lib/auth.tsx` — replaced custom `useAuth` hook with Clerk's `useUser` + `useClerk`; role is fetched from Neon via `/api/profile`; context now exposes `userId` (string) instead of a `user` object
- `src/app/auth/login/page.tsx` — uses `useSignIn() as any` (Clerk v7 type workaround); Google OAuth via `window.Clerk.client.signIn.authenticateWithRedirect()`
- `src/app/auth/signup/page.tsx` — uses `useSignUp() as any`; Google OAuth same pattern
- `src/app/auth/callback/route.ts` — simplified (Clerk handles OAuth exchange)
- `src/components/auth/auth-guard.tsx` — uses `userId` from new `useAuth()`
- `src/components/auth/admin-guard.tsx` — same
- `src/components/layout/navbar-with-auth.tsx` — `user` → `userId`
- `src/components/layout/shared-footer.tsx` — `user` → `userId`
- `src/components/layout/mobile-tab-bar.tsx` — `user` → `userId`
- `src/app/legal/legal-layout.tsx` — `user` → `userId`
- `src/app/chat/page.tsx` — `user` → `userId`
- `src/app/admin/page.tsx` — `user` → `userId`
- `tsconfig.json` — excluded `scripts/` directory from TypeScript build

**Created:**
- `src/utils/api-auth.ts` — server-side `getUser()` and `requireAdmin()` using Clerk's `auth()`
- `src/app/api/webhooks/clerk/route.ts` — handles `user.created` event with Svix signature verification; creates `profiles` row + seeds default tasks in Neon

**Clerk middleware matcher** (`proxy.ts`):
```ts
matcher: [
  "/(api|trpc)(.*)",
  "/__clerk/:path*",
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
]
```

**Clerk v7 notes:**
- `useSignIn()` / `useSignUp()` return `SignInFutureResource` / `SignUpFutureResource` in v7 — cast with `as any` to access `isLoaded`, `signIn`, `setActive`
- `authenticateWithRedirect` is not on the future resource type — access via `window.Clerk.client.signIn.authenticateWithRedirect()` instead
- `signIn.create()` for email/password returns `{ status, createdSessionId }` — must call `setActive({ session: createdSessionId })` after

### 2. Database — Neon

**Created:**
- `src/utils/db.ts` — exports `sql` (Neon HTTP client) and `sqlQuery()` for dynamic SQL

```ts
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);

// For dynamic queries (e.g. PATCH with variable SET clauses):
export async function sqlQuery<T>(query: string, params: unknown[] = []): Promise<T[]>
```

**Schema:** `supabase/migrations/018_neon_migration.sql`

Key schema differences from Supabase:
- `profiles.id` changed from `UUID` → `TEXT` (Clerk user IDs are strings like `user_xxx`)
- All foreign keys referencing `profiles.id` updated to `TEXT`
- All Supabase RLS policies removed (auth enforced at API route level via Clerk)
- `handle_new_user` trigger removed (profile creation handled by Clerk webhook)
- Vector index changed from `ivfflat` → `hnsw` (better for dynamic datasets)
- `prompt_cache` got a `last_hit_at` column (existed in Supabase, added to schema)

**All API routes** replaced `supabase.from(...)` with raw `sql\`...\`` tagged template literals.  
All table names prefixed with `public.` (required for Postgres 18 which no longer includes `public` in default `search_path`).  
Dynamic PATCH routes use `sqlQuery()` instead of `sql()` as a regular function (not supported by the HTTP client's TypeScript types).

### 3. Storage — Cloudflare R2

**Created:**
- `src/utils/r2.ts` — S3-compatible client with `uploadToR2()`, `deleteFromR2()`, `getPublicUrl()`

**Modified:**
- `src/app/api/admin/scholarships/[id]/thumbnail/route.ts` — uploads to R2
- `src/app/api/admin/guides/[id]/cover/route.ts` — uploads to R2
- `next.config.ts` — added `NEXT_PUBLIC_R2_PUBLIC_DOMAIN` to `remotePatterns`

**Custom domain:** `cdn.baireporbo.app` → Cloudflare R2 bucket `baireporbo`

---

## Environment Variables

```bash
# Neon
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require

# Clerk (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=baireporbo
NEXT_PUBLIC_R2_PUBLIC_DOMAIN=cdn.baireporbo.app
```

---

## Data Migration

### Results

| Table | Count |
|-------|-------|
| scholarships | 54 |
| ScholarshipDoc (embeddings) | 152 |
| guides | 3 |
| prompt_cache | 93 |
| profiles | 132 (126 with data, 6 empty) |
| user_bookmarks | migrated |
| user_tasks | migrated |
| chat_sessions | 82 |
| chat_messages | 312 |
| Clerk users | 132 (1 invalid email skipped) |

### Scripts (in `/scripts/`)

| Script | Purpose |
|--------|---------|
| `migrate-content.mjs` | Migrates scholarships, ScholarshipDoc (embeddings), guides, prompt_cache |
| `migrate-users.mjs` | Imports users from Supabase CSV into Clerk + creates Neon profile rows |
| `migrate-data.mjs` | Migrates user-dependent data: profiles (data fields), bookmarks, tasks, chat sessions + messages |

### Migration Order

```
1. Run 018_neon_migration.sql on Neon (schema)
2. node scripts/migrate-content.mjs      → 54 scholarships, 152 docs, 3 guides, 93 cache rows
3. node scripts/migrate-users.mjs        → 132 users → Clerk Production + Neon profiles
4. node scripts/migrate-data.mjs         → 126 profile updates, bookmarks, tasks, 82 sessions, 312 messages
5. After deployment: migrate-users.mjs --send-emails  → sends password reset to all users
```

### Key Migration Notes

- **User IDs changed:** Supabase uses UUID, Clerk uses `user_xxx` strings. Migration scripts build an `email → Clerk ID` map to remap all foreign keys.
- **tags column:** Supabase stored tags as Postgres `text[]` arrays; Neon schema uses `JSONB`. The migration script converts `{val1,val2}` → `["val1","val2"]`.
- **Clerk Dev limit:** Development instance is capped at 100 users. Production instance required for all 132 users.
- **Postgres 18 search_path:** All Neon queries must use `public.tablename` explicitly — the HTTP client does not inherit a default search path.
- **Dynamic SQL:** `neon()` tagged template function cannot be called as `sql(string, params)` — use `sqlQuery()` wrapper instead.
- **Bookmark IDs:** Supabase `user_bookmarks` had no `id` column (composite PK) — migration generates UUIDs with `gen_random_uuid()`.

---

## Clerk DNS Records (baireporbo.app on Cloudflare)

All set to **DNS only** (no proxy):

| Name | Type | Target |
|------|------|--------|
| `clerk` | CNAME | `frontend-api.clerk.services` |
| `accounts` | CNAME | `accounts.clerk.services` |
| `clkmail` | CNAME | `mail.bxupdf325qod.clerk.services` |
| `clk._domainkey` | CNAME | `dkim1.bxupdf325qod.clerk.services` |
| `clk2._domainkey` | CNAME | `dkim2.bxupdf325qod.clerk.services` |

---

## Post-Deployment Checklist

- [x] Run schema on Neon (`018_neon_migration.sql`)
- [x] Migrate content (`migrate-content.mjs`)
- [x] Migrate users to Clerk Production (`migrate-users.mjs`)
- [x] Migrate user data (`migrate-data.mjs`)
- [x] Register Clerk webhook: `https://baireporbo.app/api/webhooks/clerk` → `user.created`
- [x] Configure Google OAuth in Clerk Production + add redirect URI to Google Cloud Console
- [x] Add Clerk DNS CNAMEs in Cloudflare
- [x] Deploy app with new env vars
- [x] Verify Google OAuth works end-to-end
- [ ] Send password reset emails to existing users: `node scripts/migrate-users.mjs <csv> --send-emails`
- [ ] Keep Supabase project paused (not deleted) for 2 weeks as safety net
