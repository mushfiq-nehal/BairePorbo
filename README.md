# BairePorbo — AI Scholarship Platform

> **Live at [baireporbo.app](https://baireporbo.app)** — An AI-powered scholarship discovery and guidance platform built for Bangladeshi students pursuing international higher education.

BairePorbo (Bengali: *"let's go abroad"*) helps students find, understand, and apply for scholarships through a curated database, AI-driven matching, and a conversational AI mentor — all in a fast, bilingual (Bengali + English) web experience.

---

## Live Traffic

The platform is in active production with real users.

![Vercel Analytics — Last 7 Days](apps/web/public/Screenshot%20From%202026-06-15%2001-40-48.png)

| Metric | Last 7 Days | Change |
|---|---|---|
| Unique Visitors | **1,242** | +32% |
| Page Views | **6,259** | +52% |
| Bounce Rate | 43% | −2% |

Traffic is organic — driven primarily through Facebook community groups and word-of-mouth among Bangladeshi students.

---

## What It Does

- **AI Mentor Chat** — Students ask scholarship-related questions and get context-aware answers grounded in the actual scholarship catalogue via RAG (Retrieval-Augmented Generation). Anonymous users get a 3-message trial; signed-in users get a higher limit.
- **Scholarship Discovery** — A filterable, searchable catalogue of international scholarships with AI-generated summaries, eligibility breakdowns, and deadline tracking.
- **Semantic Matching** — NVIDIA NIM embeddings (`nvidia/nv-embedqa-e5-v5`, 1024-dim, HNSW index) power vector similarity search between student profiles and scholarship content.
- **Student Dashboard** — Personalised scholarship matches, bookmarks, and an application task tracker.
- **Admin Scholarship Wizard** — Paste → Parse (AI) → Enrich (AI) → Thumbnail Upload → Publish → RAG Ingest. Admins can go from a raw scholarship URL to a fully published, AI-searchable listing in minutes.
- **Educational Guides** — CMS-managed long-form guides (IELTS prep, GRE waivers, visa tips) with slugs, FAQs, and cover images.
- **Bilingual UI** — `LangProvider` for live Bengali/English toggle across the entire app.
- **PWA + Android TWA** — Installable as a web app and available as a native Android APK via Bubblewrap/TWA (`app.baireporbo.twa`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Auth** | [Clerk](https://clerk.com) — email/password + Google OAuth, webhook-seeded profiles |
| **Database** | [Neon](https://neon.tech) Serverless PostgreSQL 18 + **pgvector** |
| **Storage** | Cloudflare R2 (S3-compatible) — thumbnails, guide covers |
| **Chat LLM** | [OpenRouter](https://openrouter.ai) — `deepseek/deepseek-v4-flash` with `mistralai/ministral-3b-2512` fallback |
| **Embeddings / Admin AI** | [NVIDIA NIM](https://build.nvidia.com) — `nvidia/nv-embedqa-e5-v5` embeddings + completions |
| **Rate Limiting** | Redis via `ioredis` (in-memory `Map` fallback) |
| **Analytics** | Vercel Analytics |
| **Styling** | Vanilla CSS Modules — no UI framework |
| **Fonts** | Fraunces, Manrope, Hind Siliguri |
| **Package Manager** | pnpm |
| **Hosting** | Vercel |
| **CDN** | `cdn.baireporbo.app` (Cloudflare R2 public bucket) |
| **Mobile** | PWA + Android TWA (Bubblewrap) |

---

## Architecture Highlights

### AI Pipeline

```
User message
    │
    ▼
Rate limit check (Redis / in-memory)
    │
    ▼
Embed query → NVIDIA NIM (1024-dim)
    │
    ▼
Vector similarity search → Neon pgvector (HNSW, cosine)
    │
    ▼
Top-K scholarship chunks injected into system prompt
    │
    ▼
OpenRouter streaming chat (DeepSeek → Mistral fallback)
    │
    ▼
Postgres prompt cache (SHA256 key, 24h TTL)
    │
    ▼
Streamed response to client
```

### Rate Limiting Tiers

| User Type | Per Hour | Per Day |
|---|---|---|
| Anonymous | 3 | 3 |
| Signed-in student | 6 | 15 |
| Admin | 50 | 200 |
| Global circuit breaker | — | 2,000 |

### Admin Scholarship Workflow

1. **Paste & Parse** — Paste raw text/URL; NIM extracts structured fields
2. **Enrich** — AI fills in missing details, generates summary and tips
3. **Thumbnail** — Upload to R2 with WebP conversion
4. **Publish** — Set status to `active`, toggle `is_live`
5. **RAG Ingest** — Scholarship chunked, embedded, and stored in `ScholarshipDoc` for vector search

### Database Schema (Neon)

| Table | Purpose |
|---|---|
| `profiles` | User profile, role (`student`/`admin`), Clerk user ID as PK |
| `scholarships` | Full scholarship catalogue with AI-enriched fields and status workflow |
| `ScholarshipDoc` | RAG chunks with `VECTOR(1024)` column, HNSW index |
| `chat_sessions` / `chat_messages` | AI chat history (authenticated and anonymous) |
| `user_bookmarks` | Saved scholarships per user |
| `user_tasks` | Application to-do tracker |
| `guides` | Educational guide content with slugs and FAQs |
| `prompt_cache` | SHA256-keyed AI response cache with TTL and hit counter |

---

## Project Structure

```
BairePorbo/
├── apps/
│   └── web/                   # Next.js 16 — the entire production application
│       ├── src/
│       │   ├── app/           # App Router pages and API routes (29 route handlers)
│       │   │   ├── api/       # REST API (chat, scholarships, admin, webhooks, ...)
│       │   │   ├── admin/     # Admin dashboard pages
│       │   │   ├── dashboard/ # Student dashboard
│       │   │   ├── chat/      # AI mentor
│       │   │   └── ...        # Landing, scholarships, guides, auth, legal
│       │   ├── lib/           # OpenRouter client, auth helpers, rate limiter
│       │   ├── utils/         # DB (Neon), R2 storage, API auth guards
│       │   └── components/    # Shared UI components
│       ├── supabase/
│       │   └── migrations/    # SQL migration history (001–020), now applied to Neon
│       └── scripts/           # One-off utility scripts (image conversion, API tests)
├── scripts/                   # Data migration scripts (Supabase → Clerk/Neon, June 2026)
├── ARCHITECTURE.md            # Deep technical architecture reference
├── MIGRATION.md               # Infrastructure migration log (June 2026)
└── .env.example               # Canonical environment variable template
```

---

## API Routes

| Group | Endpoints |
|---|---|
| **Chat** | `POST /api/chat`, `GET/POST /api/chat/sessions`, messages |
| **Profile** | `GET/PATCH /api/profile`, scholarship match scoring |
| **Scholarships** | `GET /api/scholarships`, `GET /api/scholarships/[id]` |
| **Bookmarks & Tasks** | `GET/POST/DELETE /api/bookmarks`, `GET/POST/PATCH/DELETE /api/tasks` |
| **Dashboard** | `GET /api/dashboard` — aggregated student data |
| **Admin Scholarships** | CRUD, parse, enrich, ingest, thumbnail, generate-slugs, ingest-all |
| **Admin Guides** | CRUD, cover upload, AI refine |
| **Webhooks** | `POST /api/webhooks/clerk` — Svix-verified user creation |

---

## Application Routes

| Route | Description | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/scholarships` | Scholarship catalogue with filters | Public |
| `/scholarships/[slug]` | Scholarship detail (SEO slugs) | Public |
| `/guide` / `/guide/[slug]` | Educational guides | Public |
| `/chat` | AI Mentor (3-message anonymous trial) | Public / Students |
| `/dashboard` | Personalised dashboard | Students |
| `/profile` | Profile & matching settings | Students |
| `/admin/*` | Scholarship + guide management | Admins |
| `/auth/login` `/auth/signup` | Clerk auth pages | Public |

---

## Authentication

Powered by **Clerk** (migrated from Supabase Auth in June 2026):

- Email/password and Google OAuth
- Svix-verified webhook seeds `profiles` row and 3 default `user_tasks` on `user.created`
- Roles stored in Neon `profiles.role` (`student` / `admin`)
- `clerkMiddleware` in `src/proxy.ts` protects all non-static routes
- Client-side `auth-guard.tsx` / `admin-guard.tsx` enforce role-based access
- Server-side `requireAdmin()` in `src/utils/api-auth.ts` guards all admin API routes

---

## Getting Started (Local Development)

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9 (`npm install -g pnpm`)
- [Clerk](https://clerk.com) project (free tier works)
- [Neon](https://neon.tech) database with pgvector enabled
- [NVIDIA NIM](https://build.nvidia.com) API key
- [OpenRouter](https://openrouter.ai) API key
- [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket *(optional for local dev)*
- Redis instance *(optional — app falls back to in-memory)*

### 1. Clone & Install

```bash
git clone https://github.com/your-username/BairePorbo.git
cd BairePorbo/apps/web
pnpm install
```

### 2. Configure Environment

```bash
cp ../../.env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret (Svix) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Primary chat model (e.g. `deepseek/deepseek-v4-flash`) |
| `NVIDIA_API_KEY` | NVIDIA NIM API key |
| `NIM_EMBEDDING_MODEL` | Embedding model (`nvidia/nv-embedqa-e5-v5`) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials |
| `R2_BUCKET_NAME` | R2 bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_DOMAIN` | Public CDN domain for assets |
| `REDIS_URL` | Redis URL *(leave empty to use in-memory fallback)* |

### 3. Apply Database Migrations

Run the SQL migrations in order from `apps/web/supabase/migrations/` against your Neon database. Start with `018_neon_migration.sql` for the full current schema.

### 4. Run the Dev Server

```bash
pnpm dev
```

App available at [http://localhost:3000](http://localhost:3000).

---

## Scripts

```bash
# from apps/web/
pnpm dev       # Start development server (Next.js)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

---

## Infrastructure Migration (June 2026)

The platform was originally built on Supabase. In June 2026 it was fully migrated to a more scalable, independent stack:

| Before | After |
|---|---|
| Supabase Auth | Clerk |
| Supabase PostgreSQL | Neon Serverless PostgreSQL |
| Supabase Storage | Cloudflare R2 |
| NVIDIA NIM chat | OpenRouter (DeepSeek + Mistral) |

132 users, 54 scholarships, 152 embedding documents, and 82 chat sessions were migrated with zero downtime. See [`MIGRATION.md`](MIGRATION.md) for the full log.

---

## Status

- **Production:** [baireporbo.app](https://baireporbo.app) — live and actively growing
- **Android:** TWA APK (`app.baireporbo.twa`) — installable from the website
- **CI/CD:** Deployed via Vercel on every push to `main`

---

## License

All rights reserved © 2026 BairePorbo. This is a proprietary product — the source is shared for reference and evaluation purposes only.
