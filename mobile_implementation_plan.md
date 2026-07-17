# BairePorbo Mobile — Implementation Plan (React Native / Expo)

> Goal: a **native, app-centric Android app** for BairePorbo, published on the Google
> Play Store. The mobile app is a **new native client** for the existing Next.js backend
> — it reuses the API and data, but the UI is built fresh for mobile (not a PWA/web port).
>
> **Release strategy: lean-first, parity-over-time.** The **first store submission is a
> Lean MVP** (browse + chat + auth + language). Remaining features ship as post-launch
> updates until the app reaches full parity with the web. Full parity is the destination,
> not the first release — see §7.
>
> Status: planning. Last updated: 2026-07-17.

---

## 0. Context — what we build against

The important truth about this repo: **there is no separate backend to build.**

- `apps/api` is a dead NestJS stub (a single empty `app.module.ts`). It can be deleted.
- The real backend is the **Next.js App Router route handlers** in
  `apps/web/src/app/api/*`, deployed on Vercel at **`https://baireporbo.app`**.
- Auth is **Clerk** (`@clerk/nextjs`). Route handlers read `auth()` from
  `@clerk/nextjs/server`, where `auth.userId` **is** the `profiles.id`. All API traffic
  passes through `clerkMiddleware()` in `apps/web/src/proxy.ts`.
- **`clerkMiddleware()` accepts a session token via the `Authorization: Bearer <token>`
  header** — not only cookies. This is the linchpin: a native app that attaches a Clerk
  token as a Bearer header hits the existing endpoints with **near-zero backend changes.**
- The Clerk webhook (`/api/webhooks/clerk`, `user.created`) already seeds a `profiles`
  row, so mobile sign-ups get a profile automatically — no new backend work.
- **Chat is Server-Sent Events** (`text/event-stream`, `data: {...}\n\n`). RN's default
  `fetch` cannot stream this; handled via `expo/fetch` (see §6).

The mobile app talks to the **production Vercel deployment**. No new hosting, no new DB.

---

## 1. Recommended stack

**Expo (managed workflow) + EAS Build.** Not bare React Native.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo SDK (latest) + Expo Router** | File-based routing mirrors your Next.js App Router mental model; native stack/tab navigation out of the box |
| Language | TypeScript | Matches the monorepo |
| Auth | **`@clerk/clerk-expo`** + `expo-secure-store` | First-class Clerk support; `getToken()` for Bearer headers; secure token storage |
| Styling / UI | **NativeWind** + **react-native-reusables** (or gluestack-ui) | Tailwind-for-RN; fast, themeable (light/dark, brand palette, Hind Siliguri for Bengali) |
| Navigation | Expo Router (stack + bottom tabs) | Native transitions, gestures, deep links |
| Data fetching | **TanStack Query** (React Query) | Caching, pull-to-refresh, retries, offline-friendly |
| Streaming chat | **`expo/fetch`** (streaming responses) | Reads SSE `data:` lines to append tokens live |
| File upload (CV) | `expo-document-picker` + `expo-file-system` | Pick + upload PDF/DOCX to `/api/cv/analyze` |
| Localization | `expo-localization` + lightweight i18n | EN/BN, device-default detection; port `LangProvider` strings |
| Push | `expo-notifications` | Deadline / new-match alerts (needs a small backend addition, see §8) |
| Builds / signing / submit | **EAS Build + EAS Submit** | Produces signed AAB, manages upload keystore, uploads to Play |
| OTA updates | `expo-updates` | Ship JS fixes without a store review |

Bare RN is only justified for a native module Expo lacks — this feature set needs none.

---

## 2. Monorepo placement

```
apps/
  web/          # existing Next.js (backend + web frontend) — untouched
  api/          # dead stub — delete
  mobile/       # NEW — Expo app
packages/
  db/           # existing
  shared/       # NEW — shared TS types + typed API client (web + mobile)
```

`packages/shared` holds:
- **API response/request types** (Scholarship, Profile, ChatMessage, CV, Task, Guide, …).
- A small **`apiClient`** that centralizes `API_BASE`, Bearer-token injection, and error
  parsing (including your rate-limit error body: `signinRequired`, `resetIn`, `scope`).

Both `apps/web` and `apps/mobile` import it, so a backend shape change breaks the build
in both instead of failing silently at runtime.

---

## 3. Auth integration (do this first — it de-risks everything)

1. Wrap the app in `<ClerkProvider>` (`@clerk/clerk-expo`) using the existing
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, with `expo-secure-store` as the token cache.
2. Build native sign-in / sign-up screens with Clerk Expo hooks (`useSignIn`,
   `useSignUp`, `useSSO` for **Google OAuth** — already supported on web).
3. Attach the token on every API call:
   ```ts
   const token = await getToken();
   await fetch(`${API_BASE}/api/...`, {
     headers: { Authorization: `Bearer ${token}` },
   });
   ```
4. **Verify one protected endpoint end-to-end early** (e.g. `GET /api/profile`) to confirm
   `clerkMiddleware()` accepts the Bearer token as configured. If not, the only change is
   enabling `acceptsToken`/authorized-parties on the middleware — small and localized to
   `apps/web/src/proxy.ts`.
5. Profiles auto-seed via the existing Clerk webhook — no work.

`API_BASE = https://baireporbo.app` (staging can point at a Vercel preview URL).

---

## 4. Feature parity — screen ↔ endpoint map

All consumer endpoints (admin routes are out of scope for mobile). The **Release**
column marks what ships in the first store submission vs. later updates (§7):

| Mobile area | Screens | Endpoints | Auth | Release |
|---|---|---|---|---|
| **Scholarships** | List + filters (bottom-sheet), Detail, Documents | `GET /api/scholarships`, `GET /api/scholarships/[id]`, `GET/POST /api/scholarships/[id]/documents` | public (POST doc = auth) | 🚀 MVP |
| **AI Mentor chat** | Chat (streaming), session list, session view | `POST /api/chat` (SSE), `GET/POST /api/chat/sessions`, `GET .../[sessionId]/messages`, `DELETE .../[sessionId]` | anon trial + auth tiers | 🚀 MVP |
| **Auth** | Sign in / up / Google / sign out | Clerk Expo (+ existing `POST /api/auth/signup`) | — | 🚀 MVP |
| **Meta / config** | App-wide filters, counts | `GET /api/meta` | public | 🚀 MVP |
| **Dashboard** | Home: matches, bookmarks, tasks summary | `GET /api/dashboard` | auth | 📈 Phase 2 |
| **Bookmarks** | Saved scholarships | `GET/POST/DELETE /api/bookmarks` | auth | 📈 Phase 2 |
| **Profile** | View + edit, semantic matches | `GET/PUT /api/profile`, `GET /api/profile/match` | auth | 📈 Phase 2 |
| **Tasks** | Application task tracker (CRUD) | `GET/POST/PATCH/DELETE /api/tasks` | auth | 📈 Phase 2 |
| **CV builder** | List, create/edit, analyze (upload PDF/DOCX) | `GET/POST /api/cv`, `GET/PUT/DELETE /api/cv/[id]`, `GET/POST /api/cv/analyze` | auth | 📈 Phase 3 |
| **Guides** | List + reader (markdown) | `GET /api/guides` | public | 📈 Phase 3 |

**Bilingual (EN/BN)** ships in the 🚀 MVP.

**Bilingual (EN/BN):** port the `LangProvider` string logic into an i18n layer; default
from `expo-localization`; toggle persisted in secure/async storage. Load **Hind Siliguri**
for Bengali via `expo-font`.

---

## 5. Navigation shape (app-centric UX)

Bottom tab bar as the spine, native stacks inside each tab:

```
(tabs)
  ├─ index      → Dashboard / Home
  ├─ discover   → Scholarships list → detail → documents
  ├─ chat       → Mentor chat + session history
  ├─ cv         → CV list → editor / analyze
  └─ profile    → Profile, bookmarks, tasks, settings, language, sign-out
(auth)          → sign-in / sign-up (shown when signed out)
```

Native patterns to use throughout (this is what makes it feel like an app, not a webview):
bottom tabs, native stack transitions & swipe-back, pull-to-refresh, skeleton loaders,
bottom-sheet filters, keyboard-aware chat, haptics, light/dark theming, deep links
(`baireporbo://scholarship/[id]`) so future push notifications open the right screen.

---

## 6. Streaming chat handling

- Use **`expo/fetch`** (streaming-capable) to POST to `/api/chat`.
- Read the response body stream, buffer, split on `\n\n`, parse each `data: {...}` frame,
  and append tokens to the in-flight assistant message (mirror the web chat client's
  parser). First frame carries `{ model }`.
- Handle the non-200 JSON error bodies exactly like web: rate-limit (`scope`, `resetIn`,
  `signinRequired`), server-config errors, etc. Surface "Sign in to keep chatting" for the
  anonymous trial cap.
- Persist sessions via the `/api/chat/sessions` endpoints; support delete + resume.

---

## 7. Build sequencing — lean-first, parity-over-time

The **first store submission is the Lean MVP** (Phases 0–1 + store polish). Everything
after ships as **post-launch updates** (Expo OTA + new store builds) until full parity.
Rationale: learn the whole publishing pipeline once at low stakes, start Google's
closed-testing clock (§9.8) sooner, and let real user feedback reorder later features.

### 🚀 First release (Lean MVP)

- **Phase 0 — Foundation.** `apps/mobile` Expo app + Expo Router + NativeWind theming;
  `packages/shared` (types + apiClient); Clerk auth working; `GET /api/scholarships`
  rendering on an emulator. **Verify Bearer-token auth against `GET /api/profile`.**
- **Phase 1 — Discovery + Chat.** Scholarship list/filters/detail/documents; AI Mentor
  streaming chat + session history; auth (sign in/up + Google); EN/BN toggle + fonts.
- **Phase 1.5 — Store polish.** Empty/error/offline states, app icon + splash, dark mode
  pass, crash-free core flows, test account for reviewers → **submit to Play (see §9).**

### 📈 Post-launch updates (toward full parity)

- **Phase 2 — Account surfaces.** Dashboard, bookmarks, profile edit + semantic matching,
  tasks tracker.
- **Phase 3 — CV + Guides.** CV list/editor, PDF/DOCX upload + analyze; guides reader.
- **Phase 4 — Native extras.** Push notifications (deadlines / new matches), deep links,
  haptics, refinements from user feedback → **full parity reached.**

> Each post-launch phase = one release: OTA for JS-only changes, a new AAB when native
> config changes. Update the Data Safety form (§9.6) whenever a new feature changes what
> data is collected (e.g. CV uploads in Phase 3).

---

## 8. Backend touch-points (kept minimal)

The web backend is reused as-is. The only likely additions:

1. **Bearer-token acceptance** on `clerkMiddleware()` — verify; enable if needed (§3.4).
2. **CORS**: native `fetch` is not browser-CORS-bound, so typically nothing needed; add
   headers only if a specific route rejects the origin.
3. **Push notifications (Phase 4)**: a table to store Expo push tokens + a small route to
   register them, and a trigger/cron to send deadline / new-match pushes. New, additive.

No changes to business logic, DB schema (except push tokens), or AI pipeline.

---

## 9. Google Play Store publishing pipeline

1. **Play Console account** — $25 one-time (no existing store presence; the old TWA/PWA
   was never published, so this is a fresh account/listing).
2. **Package id** — new, clean: e.g. `app.baireporbo.android`. No keystore conflict.
3. **App signing** — let **EAS** manage the upload keystore; enroll in Google Play App
   Signing.
4. **Build AAB** — `eas build --platform android --profile production` → store-ready `.aab`.
5. **Store listing** — icon (512²), feature graphic (1024×500), phone screenshots, short +
   full description (reuse bilingual copy), privacy policy URL (reuse web `/legal`).
6. **Data Safety form** — declare accurately: email + auth (Clerk), profile data, CV file
   uploads, chat content, analytics.
7. **Content rating** questionnaire.
8. **Release tracks** — Internal → Closed → Production. Note: a personal Play account now
   requires **~12 testers for 14 days on closed testing** before production. Start this
   early and in parallel with development.
9. **Submit** — `eas submit --platform android` (or manual AAB upload).

---

## 10. Timeline (rough)

| Phase | Estimate | Release |
|---|---|---|
| 0 — Foundation | 2–4 days | 🚀 MVP |
| 1 — Discovery + Chat | ~1 week | 🚀 MVP |
| 1.5 — Store polish + submit | ~4–5 days active, + 2–3 weeks calendar for closed testing | 🚀 **First release** |
| 2 — Account surfaces | ~1 week | 📈 update |
| 3 — CV + Guides | ~1 week | 📈 update |
| 4 — Native extras | ~4–5 days | 📈 full parity |

**First release lands in ~2.5–3 weeks of work**, gated by the closed-testing window.
Closed-testing (12 testers / 14 days) runs **in parallel** — kick it off the moment the
MVP is installable (end of Phase 1). Phases 2–4 ship afterward as updates, no re-review
delay for JS-only (OTA) changes.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Bearer token not accepted by middleware | Verify in Phase 0 against `/api/profile`; enable `acceptsToken` on `clerkMiddleware()` if needed |
| SSE streaming in RN | Use `expo/fetch`; fall back to `react-native-sse` or buffered non-stream mode if issues |
| Google Play 12-tester/14-day gate delays launch | Start closed testing at end of Phase 1, run in parallel |
| Type drift between web and mobile | Shared `packages/shared` types imported by both |
| CV file upload size/timeouts | Client-side size guard; reuse existing server limits; show progress + clear errors |
| Rate limits differ from web expectations | Reuse the web client's rate-limit UX (resetIn / signinRequired) |

---

## 12. Immediate next steps

1. Delete the dead `apps/api` stub (optional cleanup).
2. Scaffold `apps/mobile` (Expo + Expo Router + NativeWind) and `packages/shared`.
3. Wire `<ClerkProvider>` and prove Bearer-token auth against `GET /api/profile`.
4. Render `GET /api/scholarships` on an emulator — first vertical slice.
5. Create the Play Console account and reserve `app.baireporbo.android`.
