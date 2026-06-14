# BairePorbo — Supabase → Clerk + Neon + R2 Migration

**Date:** June 2026  
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
- `src/lib/auth.tsx` — replaced custom `useAuth` hook with Clerk's `useUser` + `useClerk`; role is fetched from Neon via `/api/profile`
- `src/app/auth/login/page.tsx` — uses Clerk's `useSignIn` hook
- `src/app/auth/signup/page.tsx` — uses Clerk's `useSignUp` hook
- `src/app/auth/callback/route.ts` — simplified (Clerk handles OAuth exchange)
- `src/components/auth/auth-guard.tsx` — uses `userId` from new `useAuth()`
- `src/components/auth/admin-guard.tsx` — same

**Created:**
- `src/utils/api-auth.ts` — server-side `getUser()` and `requireAdmin()` using Clerk's `auth()`
- `src/app/api/webhooks/clerk/route.ts` — handles `user.created` event; creates `profiles` row + seeds default tasks in Neon

**Clerk middleware matcher** (`proxy.ts`):
```ts
matcher: [
  "/(api|trpc)(.*)",
  "/__clerk/:path*",
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
]
```

### 2. Database — Neon

**Created:**
- `src/utils/db.ts` — exports `sql` (Neon HTTP client)

```ts
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);
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

### Scripts (in `/scripts/`)

| Script | Purpose |
|--------|---------|
| `migrate-content.mjs` | Migrates scholarships, ScholarshipDoc (embeddings), guides, prompt_cache |
| `migrate-users.mjs` | Imports 132 users from Supabase CSV into Clerk + creates Neon profile rows |
| `migrate-data.mjs` | Migrates user-dependent data: profiles (data fields), bookmarks, tasks, chat sessions + messages |

### Migration Order

```
1. Run 018_neon_migration.sql on Neon (schema)
2. node scripts/migrate-content.mjs      → 54 scholarships, 152 docs, 3 guides, 93 cache rows
3. node scripts/migrate-users.mjs        → 132 users → Clerk + Neon profiles
4. node scripts/migrate-data.mjs         → 126 profile updates, bookmarks, tasks, 82 sessions, 312 messages
5. After deployment: migrate-users.mjs --send-emails  → sends password reset to all users
```

### Key Migration Notes

- **User IDs changed:** Supabase uses UUID, Clerk uses `user_xxx` strings. The migration scripts build an `email → Clerk ID` map to remap all foreign keys.
- **tags column:** Supabase stored tags as Postgres `text[]` arrays; Neon schema uses `JSONB`. The migration script converts `{val1,val2}` → `["val1","val2"]`.
- **Clerk Dev limit:** Development instance is capped at 100 users. Production instance required for all 132 users.
- **Postgres 18 search_path:** All Neon queries must use `public.tablename` explicitly.

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

- [ ] Register Clerk webhook: `https://baireporbo.app/api/webhooks/clerk` → event: `user.created`
- [ ] Send password reset emails: `node scripts/migrate-users.mjs <csv> --send-emails`
- [ ] Verify Google OAuth works end-to-end
- [ ] Keep Supabase project paused (not deleted) for 2 weeks as safety net
