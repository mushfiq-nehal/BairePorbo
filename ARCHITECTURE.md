# BairePorbo — Architecture

AI-powered scholarship guidance platform for Bangladeshi students. This document
describes how the system is built so future changes are easy to reason about.

> Last updated: May 2026. Keep this file current when you change core flows.

---

## 1. High-level overview

BairePorbo is a single **Next.js (App Router) web app** backed by **Supabase**
(Postgres + Auth + Storage) and two AI providers (**OpenRouter** for chat,
**NVIDIA NIM** for embeddings + admin helpers). It is deployed on **Vercel** and
is also installable as an Android app via a **TWA APK** generated from the PWA.

```
                         ┌─────────────────────────────┐
                         │        Vercel (Next.js)      │
                         │                              │
   Browser / TWA  ─────► │  App Router pages (RSC+CSR)  │
                         │  /api/* route handlers        │
                         │  proxy.ts (session refresh)   │
                         └───────┬───────────┬──────────┘
                                 │           │
              ┌──────────────────┘           └───────────────────┐
              ▼                                                   ▼
   ┌──────────────────────┐                        ┌────────────────────────┐
   │       Supabase       │                        │     AI providers        │
   │  Postgres + pgvector │                        │  OpenRouter (chat)      │
   │  Auth (cookies)      │                        │   - deepseek-v4-flash   │
   │  Storage (thumbnails)│                        │   - ministral-3b (fb)   │
   │  RLS policies        │                        │  NVIDIA NIM             │
   └──────────────────────┘                        │   - nv-embedqa-e5-v5    │
                                                    │   - chat (admin tools)  │
   ┌──────────────────────┐                        └────────────────────────┘
   │  Redis (optional)    │
   │  rate limiting       │  ← falls back to in-memory if REDIS_URL unset
   └──────────────────────┘
```

### Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| DB / Auth / Storage | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Vector search | Supabase pgvector (`ScholarshipDoc` table, HNSW index) |
| Chat LLM | OpenRouter (DeepSeek V4 Flash primary, Ministral 3B fallback) |
| Embeddings | NVIDIA NIM `nv-embedqa-e5-v5` (1024-dim) |
| Rate limiting | Redis (ioredis) with in-memory fallback |
| Markdown | react-markdown + remark-gfm |
| Analytics | Vercel Analytics |
| Styling | CSS Modules (no UI framework) |
| Hosting | Vercel |
| Mobile | PWA + TWA APK (Bubblewrap) |

The actual app lives in **`apps/web`**. There is no monorepo workspace tooling
at the repo root — `apps/web` is effectively the project. (`apps/api` exists as
an empty NestJS scaffold and is not used in production.)

---

## 2. Directory map

```
apps/web/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # service worker (offline shell)
│   ├── offline.html            # offline fallback page
│   ├── BairePorbo.apk          # downloadable Android app
│   ├── logo.png, og-image.png
│   └── .well-known/assetlinks.json  # TWA digital asset link
│
├── supabase/migrations/        # SQL migrations (run in order)
│
└── src/
    ├── proxy.ts                # middleware: refreshes Supabase session cookies
    │
    ├── app/
    │   ├── layout.tsx          # root layout: fonts, PWA meta, providers, tab bar, SW reg
    │   ├── providers.tsx       # client providers wrapper (Auth, Dialog)
    │   ├── page.tsx            # home / landing
    │   ├── globals.css
    │   │
    │   ├── scholarships/
    │   │   ├── page.tsx        # catalog (search, filters, cards)
    │   │   └── [id]/page.tsx   # detail page (AI summary tabs, eligibility, tips)
    │   ├── chat/page.tsx       # AI mentor (streaming, sessions, anon trial)
    │   ├── dashboard/page.tsx  # logged-in home (action card, AI picks, deadlines)
    │   ├── profile/page.tsx    # student profile form
    │   ├── auth/               # login, signup, callback
    │   ├── admin/              # admin-only: scholarship CRUD + AI tooling
    │   ├── legal/              # privacy + terms
    │   │
    │   └── api/                # route handlers (server-side)
    │       ├── chat/           # chat completion + sessions + messages
    │       ├── dashboard/      # aggregated dashboard data
    │       ├── profile/        # profile read/write + AI match
    │       ├── bookmarks/      # bookmark CRUD
    │       ├── tasks/          # user task CRUD (UI currently unused)
    │       ├── meta/           # exposes active chat model label
    │       └── admin/scholarships/  # parse, enrich, ingest, thumbnail, CRUD
    │
    ├── components/
    │   ├── layout/             # app-navbar, primary-nav, mobile-tab-bar
    │   ├── auth/               # auth-guard, admin-guard
    │   ├── ui/                 # dialog-provider
    │   └── scholarship-ai-panel/
    │
    ├── lib/
    │   ├── auth.tsx            # AuthProvider + useAuth hook (client)
    │   ├── nim.ts              # NIM embeddings + rate-limit primitive + logging
    │   ├── openrouter.ts       # streaming chat with model fallback
    │   ├── ai-completion.ts    # unified non-streaming completion (NIM/OR) for admin
    │   ├── scrape.ts           # best-effort URL scraper for admin parse
    │   ├── rate-limit.ts       # multi-window chat rate limiter
    │   ├── prompt-cache.ts     # Postgres-backed chat response cache
    │   └── model-label.ts      # pretty model names for UI
    │
    └── utils/supabase/
        ├── client.ts           # browser Supabase client
        ├── server.ts           # server client (cookie-bound) + service client
        └── middleware.ts       # middleware Supabase client
```

---

## 3. Authentication & authorization

### How sessions work
- Supabase Auth with cookie-based sessions (`@supabase/ssr`).
- **`src/proxy.ts`** runs as middleware on every non-static request and calls
  `supabase.auth.getUser()` to refresh the session cookie. This keeps logins
  alive across server components.
- Client-side, **`src/lib/auth.tsx`** (`AuthProvider` / `useAuth`) exposes
  `{ user, role, loading, signOut }`. It reads the session, fetches the user's
  `role` from `profiles`, and subscribes to auth state changes.

### Three Supabase client types (important)
| Client | File | Use | Respects RLS? |
|---|---|---|---|
| Browser | `utils/supabase/client.ts` | client components | Yes (user JWT) |
| Server | `utils/supabase/server.ts → createClient(cookieStore)` | API routes / RSC as the user | Yes (user JWT) |
| Service | `utils/supabase/server.ts → createServiceClient()` | privileged server ops | **No (bypasses RLS)** |

Rule of thumb: use the **server client** for anything done "as the user", use the
**service client** only when you must bypass RLS (RAG vector search, writing
chat history for anon users, prompt cache). Never expose the service key to the
client.

### Roles
- `profiles.role` is `'student'` (default) or `'admin'`.
- Admin API routes each define a local `requireAdmin(cookieStore)` that checks
  the role via the server client before proceeding.
- Client-side admin pages are wrapped in `components/auth/admin-guard.tsx`.

### Signup flow (important detail)
`/api/auth/signup` uses `supabase.auth.signUp` (NOT `auth.admin.createUser`),
because only `signUp` triggers the confirmation email. After signup it upserts
the `profiles` row and seeds default `user_tasks`. `emailRedirectTo` points to
`/auth/callback`, which exchanges the code for a session.

---

## 4. Database schema (Supabase / Postgres)

Migrations live in `apps/web/supabase/migrations/` and must be applied in order.
Key tables:

### `profiles`
One row per user (`id` = auth.users id). Holds `role`, `full_name`, and the
student profile fields used for AI matching: `cgpa`, `target_degree`,
`preferred_countries`, `bsc_major`, `university`, `graduation_year`,
`ielts_score`, `gre_gmat_score`, `work_experience`, `research_interests`,
`published_papers`, `internships`, `portfolio_url`, `goals_notes`.
RLS: users read/write only their own row. Auto-created by the `handle_new_user`
trigger on signup (SECURITY DEFINER, with exception handling so a task-seed
failure never blocks auth).

### `scholarships`
The catalog. Admin-provided fields (`title`, `country`, `degree_level`,
`funding_type`, `deadline`, `official_url`, `raw_description`, `status`) plus
AI-enriched fields (`eligibility_summary`, `competitiveness`, `tips`, `tags`,
`ai_summary`, `thumbnail_prompt`, `thumbnail_url`).
`status` is `draft` | `published`. Public reads are limited to `published`.
RLS: admins full access; everyone can read published rows.

### `ScholarshipDoc`  (RAG)
Chunked, embedded scholarship text for vector search.
`embedding VECTOR(1024)` (matches `nv-embedqa-e5-v5`), HNSW cosine index.
Populated by the ingest route. Queried via the `match_scholarship_docs` RPC
(SECURITY DEFINER so it works under a user JWT).

### `chat_sessions` / `chat_messages`
Conversation threads and turns. A session belongs to either `user_id`
(logged-in) or `anon_key` (anonymous trial). Messages have `role`
(`user`/`assistant`/`system`) + `content`. A trigger bumps
`chat_sessions.updated_at` on new messages.

### `user_bookmarks`
`(user_id, scholarship_id)` join, RLS-scoped to the owner.

### `user_tasks`
Per-user to-do items. The API (`/api/tasks`) and table exist, but the **UI was
removed** from profile/dashboard. Kept for a future dedicated tasks feature.

### `prompt_cache`
Postgres-backed chat response cache. Key = sha256(version + model +
normalized question). 24h TTL, `hit_count`/`last_hit_at` analytics, RLS locked
to service role. `bump_prompt_cache_hit` RPC increments hits.

---

## 5. AI subsystems

There are three distinct AI flows. Keep them separate when modifying.

### 5.1 User-facing chat (`/api/chat`)
Provider: **OpenRouter** (streaming). Library: `lib/openrouter.ts`.
- Primary model `OPENROUTER_MODEL` (deepseek-v4-flash), fallback
  `OPENROUTER_FALLBACK_MODEL` (ministral-3b). Tries primary, falls back on error.
- Flow per request:
  1. Resolve caller + tier (admin / user / anonymous).
  2. **Rate limit** via `lib/rate-limit.ts` (see §6). Returns structured 429.
  3. Verify chat session ownership (if `sessionId` given).
  4. **RAG**: embed the last user message (NIM), call `match_scholarship_docs`,
     build a context block injected into the system prompt.
  5. **Prompt cache** lookup (only for single-user-turn questions). On hit,
     replay the cached answer as a fake stream (~instant). See `lib/prompt-cache.ts`.
  6. On miss, stream from OpenRouter. First SSE event announces the real model
     (`{ model }`), then `{ token }` events, then `[DONE]`.
  7. Persist assistant message (logged-in only — anon chats stay client-side).
  8. Write to prompt cache after streaming (best-effort).
- Limits: `MAX_OUTPUT_TOKENS = 600`, `MAX_HISTORY = 12` turns.
- **Anonymous trial**: chat is open without login; the anon tier allows 3/day,
  enforced server-side + a localStorage hint counter client-side. After the
  limit the UI shows a friendly sign-up wall.

### 5.2 Embeddings + RAG (`lib/nim.ts`)
Provider: **NVIDIA NIM** `nv-embedqa-e5-v5` (free, 1024-dim).
- `generateEmbedding(text, apiKey, inputType)` — used by chat RAG, profile match,
  and scholarship ingest.
- Ingest (`/api/admin/scholarships/[id]/ingest`): chunks the scholarship text
  (900 chars, 120 overlap), embeds each chunk, replaces rows in `ScholarshipDoc`.
- Why NIM for embeddings: free tier, correct dimension, purpose-built for
  text retrieval. The slowness that motivated switching chat to OpenRouter was
  on completion, not embeddings.

### 5.3 Admin AI tooling (parse + enrich)
Provider: **selectable** per request (NIM / DeepSeek / Mistral) via
`lib/ai-completion.ts` (unified non-streaming completion).
- **Parse + Scrape** (`/api/admin/scholarships/parse`): admin pastes minimal or
  full text. If a URL is present and scraping is on, `lib/scrape.ts` fetches the
  page (best-effort, 8s timeout, HTML→text) and feeds it to the model alongside
  the pasted text. The model returns structured fields + a `confidence_note`.
  Hard prompt rule: never invent deadlines/URLs — return null instead.
- **Enrich** (`/api/admin/scholarships/[id]/enrich`): generates
  `eligibility_summary`, `competitiveness`, `tips`, `tags`, `ai_summary`,
  `thumbnail_prompt` as JSON. Model is selectable.
- The admin "new scholarship" page is a 3-step wizard:
  `Paste & Parse → Enrich → Thumbnail & Publish`, then ingest into RAG.

---

## 6. Rate limiting & cost control

### Multi-window limiter (`lib/rate-limit.ts`)
`checkChatRateLimit({ callerId, tier })` evaluates three windows and returns the
first that fails:

| Tier | Hourly | Daily | Global (all users) |
|---|---|---|---|
| anonymous | 3 | 3 | 2000/day |
| user | 6 | 15 | 2000/day |
| admin | 50 | 200 | 2000/day |

Backed by Redis (`lib/nim.ts → checkRateLimit`, Lua INCR+PEXPIRE) with an
in-memory `Map` fallback when `REDIS_URL` is unset. The global window is a
circuit breaker so a traffic spike can't drain the AI budget.

### Cost levers (the budget is ~$10/month)
1. **Prompt cache** — identical questions cost one model call, then free replays.
2. **Output cap** 600 tokens, **history cap** 12 turns.
3. **Rate limits** per tier.
4. Embeddings are free (NIM).
5. Admin parse/enrich are infrequent and selectable to a cheap model.

---

## 7. Frontend conventions

- **Styling**: CSS Modules per page/component. Shared design tokens are CSS
  variables in `globals.css` (`--ink-*`, `--sand-*`, `--teal-*`, `--coral-*`).
- **Mobile-first app feel**:
  - `components/layout/mobile-tab-bar.tsx` — fixed bottom tab bar at ≤720px
    (Home / Scholarships / Mentor / Dashboard|Sign up). Hidden on auth/admin/legal.
    Mounted globally in `layout.tsx` inside `Providers`.
  - `globals.css` reserves bottom padding on mobile; the chat page opts out via
    `data-fullscreen="true"` and handles its own spacing.
  - Pages compress headers/heroes on mobile, use sticky filter/action bars, and
    collapse multi-column layouts. The dashboard uses a mobile segmented control
    (Today / Bookmarks / Profile) driven by `data-mobile-tab` + CSS.
- **Markdown** rendered with react-markdown + remark-gfm (chat + AI summaries).
- **Model labels**: `lib/model-label.ts` turns raw IDs into friendly names
  ("deepseek/deepseek-v4-flash" → "Deepseek V4").
- **Dialogs**: `components/ui/dialog-provider.tsx` provides `useDialog()` with
  `alert`/`confirm` instead of native dialogs.

---

## 8. PWA / Android app

- `public/manifest.json` — name, icons (logo.png), theme color `#0f8f8d`,
  standalone display, app shortcuts.
- `public/sw.js` — service worker: cache-first shell, network-first for `/api/*`,
  offline fallback to `offline.html`. Registered via inline script in `layout.tsx`.
- TWA APK generated locally with **Bubblewrap** (`bubblewrap init/build`),
  package `app.baireporbo.twa`, signed with a keystore kept OUT of git
  (`.gitignore` excludes `*.keystore`/`*.jks`).
- `public/.well-known/assetlinks.json` — must contain the APK signing key's
  SHA256 fingerprint for the TWA to drop browser chrome.
- The APK is hosted at `/BairePorbo.apk`. The home page shows an Android-only
  install banner (`AndroidBanner` in `page.tsx`).

---

## 9. Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NVIDIA NIM (embeddings + admin tooling)
NVIDIA_API_KEY=
NIM_MODEL=                     # admin-tool chat model + legacy fallback
NIM_FALLBACK_MODEL=
NIM_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
NIM_EMBEDDING_URL=

# OpenRouter (user-facing chat)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_FALLBACK_MODEL=mistralai/ministral-3b-2512
OPENROUTER_SITE_URL=           # optional attribution
OPENROUTER_APP_NAME=

# Prompt cache
PROMPT_CACHE_TTL_HOURS=24
PROMPT_CACHE_DISABLED=         # "1" to disable

# Redis (optional — in-memory fallback if unset)
REDIS_URL=
REDIS_PREFIX=bp
```

---

## 10. Request flow examples

### A student asks the mentor a question
```
chat/page.tsx → POST /api/chat
  → resolve tier + rate-limit (rate-limit.ts)
  → embed question (nim.ts) → match_scholarship_docs RPC → context block
  → prompt-cache lookup (prompt-cache.ts)
      hit  → replay cached stream
      miss → stream from OpenRouter (openrouter.ts) → persist + cache
  → SSE stream back to client (model event, token events, [DONE])
```

### Admin adds a scholarship
```
admin/scholarships/new/page.tsx
  step 1: POST /api/admin/scholarships/parse  (ai-completion.ts + scrape.ts)
          → POST /api/admin/scholarships       (create draft row)
  step 2: POST /api/admin/scholarships/[id]/enrich  (ai-completion.ts)
  step 3: POST /api/admin/scholarships/[id]/thumbnail (Storage upload)
          → POST /api/admin/scholarships/[id]/ingest  (embed → ScholarshipDoc)
          → PATCH /api/admin/scholarships/[id]  (status = published)
```

### Dashboard load
```
dashboard/page.tsx → GET /api/dashboard
  → Promise.all([ profile, bookmarks, last session, new-count ])  (parallel)
  → derive readiness, closing-soon, last-message preview
  → response cached at edge (s-maxage=60, stale-while-revalidate)
client also calls GET /api/profile/match (AI picks, cached 1h in localStorage)
```

---

## 11. Gotchas & conventions for future work

- **Supabase nested selects type as arrays** even for one-to-one relations.
  Normalize (`Array.isArray(rel) ? rel[0] : rel`) — see `/api/dashboard`.
- **Prompt cache key must NOT include RAG context** — embeddings are
  non-deterministic and would make cache hits impossible. Bump
  `SYSTEM_PROMPT_VERSION` in `prompt-cache.ts` to invalidate on prompt changes.
- **Anon chats are not persisted** by design. Don't add DB writes for anon
  users in the chat route.
- **The mobile tab bar must stay inside `Providers`** in `layout.tsx` — it calls
  `useAuth()` and will crash prerender if mounted outside.
- **Admin routes** must keep their own `requireAdmin` check — there is no
  shared middleware gate for `/api/admin/*` beyond session refresh.
- **Service client bypasses RLS** — only use it where required, and never on
  data paths driven directly by untrusted client input without validation.
- Use the dedicated AI libs: streaming user chat → `openrouter.ts`; one-shot
  admin JSON tasks → `ai-completion.ts`; embeddings → `nim.ts`.
- When changing the embedding model, the `VECTOR(n)` dimension in migrations and
  the HNSW index must match, and all `ScholarshipDoc` rows must be re-ingested.

---

## 12. Known follow-ups (not yet built)

- Scheduled cleanup of expired `prompt_cache` rows (`DELETE WHERE expires_at < now()`).
- Newsletter opt-in + email preferences (currently emails are exported manually).
- Play Store listing (currently direct APK only).
- Model selector on the scholarship **edit** page (only on "new" today).
- Real tasks feature (table/API exist, UI removed).
