# BairePorbo 🎓

> An AI-powered scholarship discovery and management platform for students.

BairePorbo helps students find, track, and apply for scholarships by combining a curated scholarship database with an AI mentor chat powered by NVIDIA NIM. Administrators can publish and manage scholarships through a dedicated dashboard.

---

## ✨ Features

- **AI Mentor Chat** — Conversational AI assistant (Google Gemma via NVIDIA NIM) that answers scholarship questions, matches students to opportunities, and remembers chat history.
- **Scholarship Discovery** — Browse, search, and filter a rich catalogue of scholarships with deadline tracking and bookmark support.
- **Role-Based Auth** — Supabase-backed authentication with distinct `student` and `admin` roles.
- **Admin Dashboard** — Create, edit, archive, and publish scholarships with thumbnail uploads.
- **Student Dashboard** — Personalised scholarship matches, bookmarks, and application task management.
- **Rate Limiting** — Redis-backed (with in-memory fallback) rate limiting on all AI endpoints.
- **Semantic Search** — NVIDIA NIM embeddings (`nvidia/nv-embedqa-e5-v5`) for AI-driven scholarship matching.

---

## 🗂️ Monorepo Structure

```
BairePorbo/
├── apps/
│   ├── web/          # Next.js 16 frontend + API routes
│   └── api/          # Standalone Node.js API (supplemental)
└── packages/
    └── db/           # Shared Prisma schema / DB utilities
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Auth & DB | [Supabase](https://supabase.com) (Auth + PostgreSQL) |
| AI / LLM | [NVIDIA NIM](https://build.nvidia.com) — `google/gemma-4-31b-it` |
| Embeddings | NVIDIA NIM — `nvidia/nv-embedqa-e5-v5` |
| Rate Limiting | [Redis](https://redis.io) via [ioredis](https://github.com/redis/ioredis) (in-memory fallback) |
| Styling | Vanilla CSS (CSS Modules) |
| Package Manager | pnpm |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- An [NVIDIA NIM](https://build.nvidia.com) API key
- *(Optional)* A Redis instance for production rate limiting

### 1. Clone & Install

```bash
git clone https://github.com/your-username/BairePorbo.git
cd BairePorbo
pnpm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

| Variable | Description |
|---|---|
| `NVIDIA_API_KEY` | Your NVIDIA NIM API key |
| `NIM_MODEL` | Primary LLM model (default: `google/gemma-4-31b-it`) |
| `NIM_FALLBACK_MODEL` | Optional fallback model if the primary fails |
| `NIM_MODEL_LABEL` | Display label shown in the chat UI |
| `NIM_EMBEDDING_MODEL` | Embedding model (default: `nvidia/nv-embedqa-e5-v5`) |
| `NIM_EMBEDDING_URL` | NVIDIA NIM embeddings endpoint |
| `REDIS_URL` | Redis connection URL (leave empty to use in-memory fallback) |
| `REDIS_PREFIX` | Key namespace prefix for Redis (default: `bp`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

### 3. Run the Development Server

```bash
cd apps/web
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Application Routes

| Route | Description | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/scholarships` | Scholarship catalogue | Public |
| `/scholarships/[id]` | Scholarship detail | Public |
| `/auth/login` | Login / Sign-up | Public |
| `/dashboard` | Student personalised dashboard | Students |
| `/chat` | AI Mentor chat | Students |
| `/profile` | User profile settings | Students |
| `/admin` | Admin scholarship management | Admins |

---

## 🔑 Authentication & Roles

Authentication is handled by Supabase. After sign-up, users are assigned a role stored in the Supabase `user_roles` table:

- **`student`** — Default role; access to chat, dashboard, and scholarship browsing.
- **`admin`** — Full access to the admin panel for scholarship CRUD operations.

Middleware in `src/proxy.ts` enforces role-based access on protected routes.

---

## 🤖 AI Integration

The AI mentor is powered by **NVIDIA NIM** and uses:

1. **Chat completions** (`google/gemma-4-31b-it`) for conversational responses.
2. **Embeddings** (`nvidia/nv-embedqa-e5-v5`) for semantic scholarship matching.

A fallback model chain is supported — configure `NIM_FALLBACK_MODEL` and the system will automatically retry with it if the primary model fails.

Rate limiting is enforced per user IP:
- **With Redis** — Distributed, persistent rate limiting via a Lua atomic script.
- **Without Redis** — Falls back to an in-memory `Map` per server instance.

---

## 📦 Scripts

All commands should be run from `apps/web/`:

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

---

## 📄 License

This project is for educational and portfolio purposes. All rights reserved © BairePorbo.
