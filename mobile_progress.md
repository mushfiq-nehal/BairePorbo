# BairePorbo Mobile — Progress Log

> Companion to `mobile_implementation_plan.md`. Records what's actually built,
> verified, and outstanding. Last updated: 2026-07-18.

## TL;DR

A native **Expo (SDK 57) Android app** for BairePorbo is built and running against
the existing production backend (`https://www.baireporbo.app`). Phase 0 + Phase 1
(MVP) are **code-complete, typecheck-clean, and verified end-to-end on a device**
(emulator + a physical Realme phone). The UI has been **fully rebranded to match
the web** (teal/coral light theme, Fraunces/Manrope/Hind Siliguri, real logo,
web copy, scholarship cover images).

Not yet done: Play Store submission, and Phase 2–4 features (dashboard, bookmarks,
profile editing, tasks, CV, guides, push).

---

## Where the code lives

```
apps/mobile/            # NEW — the Expo app (self-contained pnpm project)
  app/                  # Expo Router routes
    (auth)/             # sign-in, sign-up
    (tabs)/             # index (Home), discover/, chat/, profile
  src/
    components/ui/      # Txt, Button, Card, Chip, Screen, Logo (design system)
    components/GoogleButton.tsx
    i18n/               # LangProvider + translations (EN/BN, from web copy)
    lib/                # api (client provider), config, token-cache, anon-key, query
    theme.ts            # color tokens + fonts + shadows (ported from web)
  assets/               # logo.png, icon, adaptive-icon, splash (from web brand)
packages/shared/        # NEW — dependency-free TS: backend types + typed apiClient
```

`apps/api` (dead NestJS stub) is untouched; `apps/web` is untouched.

---

## What's built & verified ✅

Every screen below was driven on-device and screenshotted (signed in as a test account):

| Area | State |
|---|---|
| **Auth** — email/password + Google (SSO), verification | ✅ Sign-in works; Google wired |
| **Home** | ✅ Logo, teal kicker, Fraunces hero, teal/coral feature cards |
| **Scholarships (Discover)** | ✅ 66 live scholarships, cover images, filters (bottom sheet), pull-to-refresh |
| **Scholarship detail** | ✅ Hero image, About/Eligibility/Benefits, AI document checklist, Apply link |
| **AI Mentor chat** | ✅ Live SSE streaming, session persistence + history + delete |
| **Profile** | ✅ Bearer-auth confirmed ("connected"), profile fields, sign out |
| **Bilingual EN/BN** | ✅ Hind Siliguri; toggle in Profile; strings taken from the web |
| **Branding** | ✅ Light teal/coral theme, real logo, app icon + splash |

### The backend contract (reused as-is)
- **Base URL: `https://www.baireporbo.app`** (the canonical `www` host).
- Auth: Clerk session token as `Authorization: Bearer <token>`. `auth().userId` = `profiles.id`.
- Anonymous chat: stable `x-anon-key` header.
- Chat is SSE: `data: {"model"}` → `data: {"token"}` → `data: [DONE]`; read via `expo/fetch`.
- `clerkMiddleware()` accepts the Bearer token unchanged — **zero backend changes** needed.

---

## Important gotchas discovered (and fixed)

1. **apex → www 301 breaks all POSTs.** `baireporbo.app` 301-redirects to
   `www.baireporbo.app`, and a 301 downgrades POST→GET, so chat/sessions/documents/
   writes hit routes as GET → **405**. GETs survive the redirect, which masks it.
   **Fix:** point `EXPO_PUBLIC_API_BASE` / `app.json extra.apiBase` / `config.ts` at `www`.

2. **Clerk Native API must be enabled.** The web uses a **production** Clerk instance
   (`clerk.baireporbo.app`, `pk_live_…`). Production instances ship with the native API
   **off** → clerk-expo throws on launch ("Native API is disabled…"). Enable it once at
   **Clerk Dashboard → Configure → Native applications**. Same key = same users + Google.

3. **pnpm v11 config lives in `pnpm-workspace.yaml`, not `.npmrc`.** `nodeLinker: hoisted`
   is required so Metro can resolve NativeWind's `react-native-css-interop`.

4. **2FA sign-in isn't implemented.** If an account has 2FA, email/password sign-in shows
   a clear "not supported — use Google or disable 2FA" message (see follow-ups).

---

## How to run it

### Config (already set in `apps/mobile/.env.local`)
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…   # same instance as web
EXPO_PUBLIC_API_BASE=https://www.baireporbo.app
```

### Dev (Metro + emulator/device)
```
cd apps/mobile
npx expo start --dev-client          # Metro
# needs a dev build installed; connect device over adb reverse tcp:8081 tcp:8081
```

### Standalone APK (installable, no Metro) — what's on the phone now
```
cd apps/mobile
npx expo prebuild -p android --no-install     # only when app.json/native config changes
cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
# → android/app/build/outputs/apk/release/app-release.apk  (~45 MB, arm64)
adb install -r app-release.apk
```
Signed with the debug keystore (fine for sideloading; **not** for Play — that needs EAS +
a real upload key). App id: `app.baireporbo.android`.

### Verify commands
```
npx tsc --noEmit          # types (mobile + shared)
npx expo-doctor           # project health (20/20 passing)
npx expo export --platform android   # full Metro bundle sanity
```

---

## Stack

Expo SDK 57 · Expo Router · NativeWind v4 (Tailwind) · Clerk (`@clerk/clerk-expo`) ·
TanStack Query · `expo/fetch` (SSE) · `@expo/vector-icons` (Ionicons) ·
fonts: Fraunces + Manrope + Hind Siliguri (`@expo-google-fonts`).

---

## Outstanding / next

**Store submission (needs the user):**
- Play Console account ($25), reserve `app.baireporbo.android`.
- Store listing: screenshots, feature graphic, descriptions, privacy policy URL.
- Data Safety + content rating forms.
- Closed testing: ~12 testers / 14 days on a personal account — start early.
- Production signing via EAS (`eas build`/`eas submit`) instead of the debug keystore.

**Phase 2–4 (post-launch, per plan §7):**
- Dashboard, bookmarks, profile editing + semantic matches, tasks tracker.
- CV builder (PDF/DOCX upload + analyze), guides reader.
- Push notifications (deadlines / new matches), deep links, haptics.

**Polish / follow-ups:**
- Implement the 2FA (second-factor) sign-in step for full parity.
- Offline / empty-state pass; light-mode already the default (dark not needed).
- Optional: featured-scholarship images on Home, real Google logo asset.

---

## Verification snapshots

On-device screenshots from the build sessions are in the scratchpad
(`…/scratchpad/*.png`): sign-in, home, scholarships (with images), detail (hero image),
chat (streaming), profile (EN + BN). Regenerate anytime by driving the emulator via adb.
