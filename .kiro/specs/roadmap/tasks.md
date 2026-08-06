# Implementation Plan: AI Personalized Roadmap

## Overview

Six tasks, in dependency order rather than preference order. TypeScript throughout, as the design specifies — nothing here needs a language decision.

**Tasks 1-4 are `apps/web` only and safe to land during the remaining Play closed-testing days.** New tables nothing reads, new routes nothing calls, and one engine that no shipped client can reach. The entire live blast radius is the single rewritten `PUT /api/profile` handler, which is why its two regression tests (1.6) are mandatory rather than optional and why they land in the same task as the rewrite.

**Tasks 5-6 are `apps/mobile` and ship as 0.3.0 / versionCode 6 after 0.2.3 is promoted to production.** The roadmap does not go into the closed track: closed-testing eligibility is testers × days, not build freshness, so a half-built feature buys nothing and risks breaking testers days before promotion.

Two invariants hold at every task boundary. Each task is independently verifiable — the "Verify" line under each says how. And no task leaves an existing route broken: the profile route is rewritten and re-tested inside one task, `PROFILE_FIELDS` and `/api/profile/match` are never touched, and every new route is additive.

## Tasks

- [ ] 1. Schema, profile route, shared types and the test runner
  - Web only. Landing this during closed testing is safe; landing it half-done is not, so 1.5 and 1.6 go together.

  - [x] 1.1 Set up Vitest and fast-check in `apps/web`
    - Add `vitest` and `fast-check` as dev dependencies at pinned versions; add a `test` script
    - Two project entries: one for web tests, one whose `include` covers only `src/**/roadmap-view*.test.ts` so a React Native import in the mobile pure module fails loudly at load rather than silently transforming
    - A `bench` selection excluded from the default `vitest run`
    - _Requirements: 12.3_

  - [x] 1.2 Write `apps/web/supabase/migrations/026_ai_roadmap.sql`
    - Boxed header in the style of `023_cv_builder.sql`; `BEGIN`, both `SET LOCAL` timeouts, then eight `ADD COLUMN IF NOT EXISTS` on `profiles` with no `DEFAULT` and no `NOT NULL`
    - `roadmaps` (PK `user_id`, nullable `readiness`) and `milestone_progress` (PK `(user_id, milestone_key)`), plus the partial narration index
    - _Requirements: 3.1, 3.2, 3.3, 11.1, 12.6_

  - [x]* 1.3 Write the migration text assertions
    - No `DROP`, `RENAME`, `ALTER TYPE` or `ADD CONSTRAINT`; every `profiles` column additive and nullable; exactly two `CREATE TABLE`; `BEGIN` before both `SET LOCAL`, both before the first schema statement; the composite primary key present
    - _Requirements: 3.1, 3.2, 3.3, 11.1_

  - [ ] 1.4 Verify Migration 026 on a Neon branch
    - Create a copy-on-write branch from production and apply the migration to it
    - Apply it a second time; diff `pg_catalog` and a row snapshot of `profiles` to prove idempotency
    - From a second session hold `ACCESS EXCLUSIVE` on `profiles` and confirm the migration aborts inside 3 s with the schema unchanged
    - Record the three outcomes in the task notes; the live AI call against this branch is 4.6
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 1.5 Rewrite `PUT /api/profile` as a partial update
    - Replace the fifteen-name destructure with the `WRITABLE` allow-list of `ColumnSpec`s; build the `SET` clause from keys present in the body only; bind every value positionally through `sqlQuery`
    - `splitDocsPatch` merges `docs` at the key level and removes a key on an explicit null; unknown doc keys and out-of-domain values are dropped, not rejected
    - Empty or unknown-keys-only body returns 400 with nothing written; `target_intake_year` outside 2025-2035 returns 400
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 1.6 Write the two mandatory profile regression tests
    - Version skew: seed all eight roadmap columns, `PUT` exactly the fifteen Shipped_Client keys, assert none of the eight appears in the `SET` clause and all eight retain their seeded values
    - Explicit clearing: `PUT { cgpa: null }` emits `SET cgpa = $1, updated_at = NOW()` with `params[0] === null`
    - Not optional. These are the only guard on the one live surface this release changes
    - _Requirements: 1.2, 1.3, 1.9_

  - [x]* 1.7 Write property test for partial updates
    - **Property 1: Partial update touches only the keys it was given**
    - **Validates: Requirements 1.1, 1.3**

  - [x]* 1.8 Write property test for clearing and parameterisation
    - **Property 2: Clearing values clear, and only through parameters**
    - **Validates: Requirements 1.2, 1.4**

  - [x]* 1.9 Write property test for the allow-lists
    - **Property 3: The allow-lists are the schema**
    - **Validates: Requirements 1.5, 1.6, 1.8**

  - [x]* 1.10 Write property test for live-surface isolation
    - **Property 4: The roadmap columns are invisible to the live surfaces**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 1.11 Add the wire types and client methods to `packages/shared`
    - `RoadmapResponse`, `RoadmapMilestone`, `RoadmapNote`, `RoadmapPillar`, `RoadmapAction`, `MilestonePatchResponse`, `ProfileUpdate` — hand-written snake_case, matching what the routes will emit
    - `getRoadmap`, `generateRoadmap`, `updateMilestone` on the api client alongside the existing `updateProfile`
    - _Requirements: 2.6, 5.1_

  - [x]* 1.12 Write the live-surface preservation examples
    - `PROFILE_FIELDS.length === 14`; frozen response-key snapshots for `GET /api/profile`, `GET /api/dashboard` and `GET /api/profile/match`; the match route's sparseness gate still reads exactly three fields
    - _Requirements: 2.1, 2.4, 2.6_

  - [ ] 1.13 Checkpoint - schema and profile route
    - Ensure all tests pass, ask the user if questions arise. Migration 026 is applied to production before any code that reads the new tables deploys.
    - _Requirements: 3.7_

- [x] 2. Engine core: types, inputs, scoring, fingerprint
  - Pure functions only. No `import { sql }`, no `fetch`, no `Date.now()` in any file in this task.

  - [x] 2.1 Write `apps/web/src/lib/roadmap/types.ts`
    - Every union and record type from the design, plus `ENGINE_VERSION`, `CONFIDENCE_FLOOR = 40` and `READINESS_GATE_INPUTS = ["degree", "cgpa"]`
    - _Requirements: 4.5, 5.1_

  - [x] 2.2 Write `inputs.ts` — the parsers and the known/unknown rule
    - `parseCgpa`, `parseEnglishBand`, `countFromProse`, `monthsFromProse`, `normalizeDocs`, `splitCountries`, `parseDegree`, `toRoadmapInputs`
    - `REQUIRED_INPUT_KEYS` holds the eight student-supplied keys only; `knownInputs` / `unknownInputs` implement the known-when table exactly, including the declared-zero versus unparseable-prose distinction
    - _Requirements: 4.6, 5.6, 7.5_

  - [x]* 2.3 Write property test for unknown handling
    - **Property 8: Unparseable is unknown, never zero**
    - **Validates: Requirements 4.6, 7.5**

  - [x] 2.4 Write `scoring.ts` — six pillars and the weight table
    - `PILLAR_WEIGHTS` with three columns each summing to 100; `scoreAcademics`, `scoreEnglish`, `scoreDocuments` (six declared integer buckets per column), `scoreResearch`, `scoreExperience`, `scoreApplicationProgress`
    - `scoreProfile` returns six pillars in fixed order with `earned`, `available`, `known` and a derived `detail`; unknown degree applies the `master` column
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.9_

  - [x]* 2.5 Write property test for scoring determinism
    - **Property 5: Scoring is deterministic**
    - **Validates: Requirements 4.1, 7.8**

  - [x]* 2.6 Write property test for the breakdown invariant
    - **Property 7: The breakdown adds up**
    - **Validates: Requirements 4.2, 4.3, 4.5**

  - [x]* 2.7 Write property test for application progress
    - **Property 10: Application progress is a monotonic function of bookmark count**
    - **Validates: Requirements 4.9, 4.10**

  - [x] 2.8 Implement confidence and the readiness gate
    - `confidence = round(100 × known / 8)`; `highestWeightUnknown` by pillar weight, tie-broken by `REQUIRED_INPUT_KEYS` order
    - `readinessOf` returns an integer only when confidence is at or above the floor **and** neither `degree` nor `cgpa` is in `unknownInputs`; `null` otherwise. A profile carrying only the four wizard answers therefore reports `null`, not 6
    - _Requirements: 5.1, 5.2, 5.6, 5.9, 5.10_

  - [x]* 2.9 Write property test for the readiness gate
    - **Property 11: Readiness is an integer exactly when the floor is cleared and the academic inputs are known**
    - **Validates: Requirements 5.1, 5.2, 5.6, 5.9, 5.10**

  - [x] 2.10 Implement strengths and weaknesses
    - Strength at `earned / available >= 0.70`; weakness at `<= 0.30` with `known === true`, or an absent Evidence_Requirement on a known pillar
    - One weakness per pillar with the evidence-named candidate winning; empty weakness list whenever readiness is `null`; `pointsAtStake` ordering with the pillar-weight then key tie-breaks; both lists truncated to three; `WEAKNESS_RESOLVER` attaches a milestone key to every weakness
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9_

  - [x]* 2.11 Write property test for derived notes
    - **Property 17: Strengths and weaknesses follow the thresholds, and unknown never accuses**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9**

  - [x] 2.12 Implement evidence satisfaction and projection
    - `evidenceSatisfied`, `satisfyEvidence` returning a copy with only that milestone's evidence fields filled at their minimum passing value, and `projectedReadiness` re-running `scoreProfile` over that copy
    - _Requirements: 6.1, 6.5_

  - [x]* 2.13 Write property test for projection
    - **Property 13: Projection means the evidence is in place**
    - **Validates: Requirements 6.1, 6.5**

  - [x] 2.14 Write `fingerprint.ts`
    - Recursive key-sorted `stableStringify` (arrays keep order, objects do not) and `sha256` over `${ENGINE_VERSION}:${stableStringify(inputs)}`
    - _Requirements: 4.7, 4.8_

  - [x]* 2.15 Write property test for the fingerprint
    - **Property 9: The fingerprint depends on values and the engine version, nothing else**
    - **Validates: Requirements 4.7, 4.8**

  - [x]* 2.16 Build the persona fixtures
    - The six fixtures from the design with their hand-computed expectations, including **Wizard just finished** — four known inputs, confidence 50, pillars summing to 6, readiness `null`, no strengths, no weaknesses
    - _Requirements: 5.2, 5.10, 7.6_

- [ ] 3. Catalog, country rules, graph, and the two deterministic routes
  - Ends with a roadmap a client could read, with no AI involved anywhere.

  - [ ] 3.1 Run the `profiles.preferred_countries` distribution query
    - Group and count the stored values against production (read-only), record the ranking in the task notes, and confirm or replace Germany, Canada, USA, UK and Japan before 3.4 hardcodes them
    - **Written, not run.** The query lives in `apps/web/supabase/queries/preferred-countries-distribution.sql` — two read-only SELECTs, splitting the free-text column on the same separators as `splitCountries`, with a header explaining how to read the ranking and when a swap is justified. No database was touched, so **the ranking is unverified and Germany, Canada, USA, UK and Japan stand as the design default** in `country-rules.ts`. Run it and record the ranking and sample size here to close this sub-task; the second query lists the raw spellings, which is what `COUNTRY_ALIASES` needs
    - _Requirements: 8.2, 8.3_

  - [x] 3.2 Write `catalog.ts`
    - The twelve country-independent `MilestoneDef`s with bilingual title and description, stage, ETA, dependencies, priority, pillar, Evidence_Requirement, action target, `appliesTo` and `isSatisfied`; plus `MENTOR_SEEDS`
    - `apply` and `visa` carry no Evidence_Requirement on purpose
    - _Requirements: 8.1, 8.8_

  - [x]* 3.3 Write property test for the catalog
    - **Property 18: The catalog is well formed**
    - **Validates: Requirements 8.1, 8.8**

  - [x] 3.4 Write `country-rules.ts`
    - Five rules plus `GENERIC_RULE`, each with aliases, extra milestones, ETA overrides, `countryDocKeys` and intake start months; `resolveCountry` lowercases, trims, matches aliases exactly and falls back to generic
    - _Requirements: 5.7, 5.8, 8.2, 8.4_

  - [x]* 3.5 Write property test for the generic fallback
    - **Property 12: An unrecognised country yields the generic path, fully translated**
    - **Validates: Requirements 5.7, 5.8, 8.5**

  - [x]* 3.6 Write property test for country path assembly
    - **Property 19: A matched country adds its steps and drops what does not apply**
    - **Validates: Requirements 8.4, 8.6, 8.7**

  - [x]* 3.7 Write the country examples
    - Germany's path contains the APS and blocked-account keys; Canada's contains proof of funds
    - _Requirements: 8.6, 8.7_

  - [x] 3.8 Write `graph.ts` — `buildRoadmap` and its seven steps
    - Resolve country, assemble and filter defs with ETA overrides, `topoSort` with `CycleError`, merge status (manual override → auto-satisfaction → stored), `planDueDates` over `dhakaDayStart`, `assessFeasibility` bands with roll-forward, then score and project
    - `nextAction` by projected gain then due date then priority; `state` derived so exactly one milestone is `active`
    - _Requirements: 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.9, 10.1, 10.2, 10.3, 16.4_

  - [x]* 3.9 Write property test for ordering and dates
    - **Property 20: Ordering and dates respect the graph and the Dhaka day**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

  - [x]* 3.10 Write property test for feasibility
    - **Property 21: Feasibility is a total band function, and a past intake rolls forward**
    - **Validates: Requirements 9.5, 9.6, 9.7, 9.9**

  - [x]* 3.11 Write property test for next-action selection
    - **Property 14: The next action is the maximum under the stated order**
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x]* 3.12 Write property test for status merging
    - **Property 22: Auto-satisfaction and manual override compose predictably**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.8**

  - [x]* 3.13 Write property test for engine purity
    - **Property 6: The engine performs no I/O**
    - **Validates: Requirements 4.4, 12.1, 12.2**

  - [x] 3.14 Write `GET /api/roadmap`
    - `getUser()` gate, four user-scoped reads in one `Promise.all`, `toRoadmapInputs`, `buildRoadmap` with `now` passed in, `toWire`, the single `ON CONFLICT (user_id) DO UPDATE` upsert with the `previous_readiness` and narration-preserving `CASE` clauses, `Cache-Control: private, no-store`
    - Keys absent from the current path are filtered from the response and left in the table
    - _Requirements: 5.1, 11.6, 11.7, 12.1, 12.4, 12.5, 12.6, 12.8, 12.9, 12.10_

  - [x] 3.15 Write `PATCH /api/roadmap/milestones/[key]`
    - The `prior` CTE upsert so `celebrate` reads the pre-write `celebrated_at`; `manual_override` always true; `completed_at` cleared on a move back to `todo`; delta 0 with an evidence label when the Evidence_Requirement is unsatisfied; `unlocked_keys`; 400 for a key outside the caller's path and for `progress` outside 0…`targetCount`
    - _Requirements: 6.6, 10.2, 10.5, 10.7, 10.8, 17.6, 19.5, 19.6_

  - [x]* 3.16 Write property test for anti-gaming
    - **Property 15: Recording a status never moves the score**
    - **Validates: Requirements 6.8, 10.4, 10.6**

  - [x]* 3.17 Write property test for unsatisfied evidence
    - **Property 16: An unsatisfied evidence requirement pays zero and says which one**
    - **Validates: Requirements 6.6, 6.7**

  - [x]* 3.18 Write property test for progress durability
    - **Property 23: Progress survives every regeneration and every path change**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.7**

  - [x]* 3.19 Write property test for the fingerprint cache
    - **Property 24: The cache turns exactly on the fingerprint**
    - **Validates: Requirements 11.6, 12.4, 12.5**

  - [x]* 3.20 Write property test for authentication and scoping
    - **Property 25: Every roadmap statement is authenticated and scoped**
    - Covers the read route and the milestone route; the generate route joins the same test when 4.3 creates it
    - **Validates: Requirements 12.9, 12.10**

  - [x]* 3.21 Write the route examples
    - English test marked done with no band: English pillar 0 plus the prompt naming the score entry; `done → todo` clears `completed_at` and keeps `manual_override`; first completion returns `celebrate: true` and the second `false`
    - _Requirements: 10.5, 10.7, 19.5, 19.6_

  - [x]* 3.22 Add the non-gating engine benchmark
    - `bench/roadmap-engine.bench.ts` reports construction time for a twelve-milestone path, outside the default `vitest run`, and never fails the suite
    - _Requirements: 12.3_

- [ ] 4. Narration
  - The only part that can fail, and the only part the feature can ship without. Last for both reasons.

  - [ ] 4.1 Wire the model choice
    - `| "deepseek-flash-0731"` added to the `ModelChoice` union in `model-options.ts` and left out of `MODEL_OPTIONS`; one branch added to `resolveOpenRouterModel` in `ai-completion.ts`
    - _Requirements: 13.1_

  - [ ] 4.2 Write `narrate.ts` — prompt and validator
    - System prompt carrying the three key whitelists and the response schema; user prompt with derived facts and the free text inside a delimited block whose marker token is stripped from the text first
    - `fetchCompletion` with `json: true`, `reasoning: { enabled: false }`, `temperature: 0.3`, `timeoutMs: 25000`
    - Validator steps 1-11 in order: parse, shape, whitelist, dedupe, coerce, per-language fallback, drop empties, clamp at 240 / 320 per language, fill gaps from catalog and derived copy, mentor fallback, assert the key set
    - _Requirements: 7.11, 7.12, 7.13, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_

  - [ ] 4.3 Write `POST /api/roadmap/generate`
    - `checkRateLimit` at 10/hour with `Retry-After` on 429; the two-attempt ladder; on success store narration, fingerprint, model and `narration_status: 'ready'`; on double failure return 200 with `failed`
    - _Requirements: 13.10, 13.11, 13.12, 14.3_

  - [ ]* 4.4 Write property test for the narration boundary
    - **Property 26: The narrator cannot change structure**
    - **Validates: Requirements 7.11, 7.12, 7.13, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.12**

  - [ ]* 4.5 Write the narration examples
    - The `fetchCompletion` argument shape including `reasoning: { enabled: false }`; the ladder under timeout, non-2xx and unparseable JSON, ending 200 with `failed`; the 429 with `Retry-After`; a read with `OPENROUTER_API_KEY` unset returning the complete deterministic body with `narration_status: 'failed'`
    - _Requirements: 13.1, 13.2, 13.10, 13.11, 14.1, 14.2, 14.3_

  - [ ] 4.6 Complete the Neon branch verification
    - Run the engine tests, the route tests and at least one live narration call against the branch from 1.4, proving the pinned model, JSON mode and `reasoning: { enabled: false }` against the real provider; record the response and timing in the task notes
    - Fire concurrent `GET /api/roadmap` calls for one user against the branch and assert the `roadmaps` table holds exactly one row
    - _Requirements: 3.6, 12.7_

  - [ ] 4.7 Checkpoint - web complete
    - Ensure all tests pass, ask the user if questions arise. Every route works with the AI provider unreachable.

- [ ] 5. Mobile: pure view module, wizard and journey screen
  - Starts only after 0.2.3 is promoted to production. Ships as part of 0.3.0.

  - [ ] 5.1 Write `apps/mobile/src/lib/roadmap-view.ts` — the extracted pure functions
    - `nodeStateFor`, `accessibilityLabelFor`, `readinessLabel`, `scrollTargetFor`, `stageProgressFor`, `connectorFillFor`, `bannerCopyFor`, plus `pick`, `STAGE_ORDER` and the `STAGE_COLORS` palette from `theme.ts`
    - No import of `react`, `react-native`, `expo-*`, `@/i18n` or `./roadmap`. Translation lookup arrives as an injected `t`
    - `readinessLabel` is the only place the three display states — score, unlock, setup — are decided
    - _Requirements: 5.3, 5.4, 5.5, 5.11, 16.4, 16.5, 16.6, 16.8, 16.10, 19.2, 19.4_

  - [ ]* 5.2 Write the mobile unit tests
    - `roadmap-view.ts` contains no React Native, React, Expo, i18n or hook import specifier
    - Every `roadmap.*` key exists in both `en` and `bn` with a non-empty value, including one per `StrengthKey` and per `WeaknessKey`
    - Every colour, radius, shadow and gradient the roadmap names resolves to an export of `theme.ts`, and no roadmap component uses `teal500` or `coral500` as a text colour on a light surface
    - _Requirements: 7.14, 15.8, 16.3, 16.9_

  - [ ]* 5.3 Write property test for node presentation
    - **Property 27: Node presentation is a total function of the roadmap response**
    - **Validates: Requirements 16.4, 16.8, 16.10, 19.2, 19.3**

  - [ ]* 5.4 Write property test for the readiness wording
    - **Property 28: One readiness rule, worded once, for every surface**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.11, 16.5, 16.6, 18.3, 18.7, 19.4**

  - [ ] 5.5 Write `src/lib/roadmap.ts` — query keys and hooks
    - `useRoadmap`, `useUpdateMilestone` with invalidation of `['roadmap']` and `['dashboard']` on settle, `useCountUp`, `useReduceMotion`
    - _Requirements: 12.8, 19.9_

  - [ ] 5.6 Add the roadmap keys to `translations.ts`
    - Every key from the design in both `en` and `bn`, including `roadmap.unlockScore`, `roadmap.unlockScoreCta`, `roadmap.stageCount`, one entry per `StrengthKey` and per `WeaknessKey`, and the wizard strings
    - _Requirements: 7.14, 15.8, 16.9_

  - [ ] 5.7 Build the Onboarding_Wizard
    - `app/roadmap/_layout.tsx`; three steps collecting target and intake, English type/status/date, and the Docs_Map; `gradients.signin` backdrop, `teal500`/`sand300` progress dots, Fraunces step titles, large `Pressable` option cards taking a 2 px `teal500` border when selected
    - Every answer written through `PUT /api/profile`; step index derived from which profile fields are filled so it resumes across installs; an empty required field holds the step and names the field; step 3 writes `roadmap_onboarded_at` and navigates to the journey
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

  - [ ] 5.8 Build the Journey_Screen
    - `ReadinessHeader` rendering `readinessLabel`'s three states — Fraunces 42 px score with the Home-identical gradient bar, the `coral100` unlock banner, or the wizard entry point
    - `NoteChips` (teal strengths with a checkmark, tappable coral weaknesses with a forward arrow), `ScoreBreakdownCard`, `Timeline` with measured offsets and scroll-to-active, `StageGroup` headers built from `Chip` plus `stageProgressFor`, `MilestoneNode` with the four state compositions and the `shadow.teal` active beacon, `TimelineConnector` with per-stage gradients, `FeasibilityNotice`, and the sticky `MentorCard` in the Home mentor treatment
    - Loading state while the request is in flight with no cache; catalog copy and a retry control while narration is `pending` or `failed`; the roadmap renders without waiting on generate
    - _Requirements: 5.5, 5.11, 7.10, 9.8, 14.4, 14.5, 14.6, 14.7, 16.1, 16.2, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11_

  - [ ] 5.9 Add the animation and haptics primitives
    - `src/lib/haptics.ts` as no-op `impact` / `selection` / `success` wrappers; `useReduceMotion` over `AccessibilityInfo` plus its subscription, collapsing every `withTiming` to a direct assignment; `useCountUp` returning the target on the first frame when reduce motion is on
    - _Requirements: 19.1, 19.7_

- [ ] 6. Mobile: milestone detail, home surface, completion feedback and release
  - [ ] 6.1 Build the Milestone_Screen
    - Title, description, explanation, duration, due date, priority and status control for the route key; `ActionTarget` routing to the CV builder, discovery with country and degree filters, the mentor through `chat-handoff.ts`, or a guide; not-found state with a way back for a key outside the current path
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ] 6.2 Wire the milestone status control
    - The status control calls `useUpdateMilestone` and invalidates the roadmap query; the returned `celebrate`, `delta` and `evidence_label` drive the feedback
    - _Requirements: 17.7, 19.9_

  - [ ] 6.3 Swap the Home surface
    - The scholarships quick-action becomes the roadmap card in the same grid slot; the CV card stays; the entire "Profile completeness" `Pressable` is deleted so exactly one percentage remains
    - The card renders `readinessLabel`: readiness plus the next-action title, or the unlock prompt, or the setup prompt — never a percentage while readiness is `null`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 6.4 Write the Home source assertions
    - `app/(tabs)/index.tsx` has no `home.yourProfile` block and exactly one percentage rendering; it pushes `/roadmap` from the former scholarships slot and keeps the `/cv` card; `app/(tabs)/_layout.tsx` declares the same tab set as 0.2.3
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.6, 18.8_

  - [ ] 6.5 Build the completion feedback
    - Readiness count-up from the previous value, node fill, connector segment fill from `connectorFillFor`, the following node promoted to `active`, the `teal100` bloom scaling out from the node on one shared value, and the `CompletionBanner` lines from `bannerCopyFor`
    - Reduce motion renders every end state with no animation; the banner fires once per milestone, driven by the server's `celebrate`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.7_

  - [ ] 6.6 Invalidate the roadmap on the writes that feed it
    - Profile save, CV save and bookmark change each invalidate `['roadmap']`
    - _Requirements: 19.8_

  - [ ] 6.7 Bump the release metadata
    - `app.json`: `expo.version` `0.3.0`, `expo.android.versionCode` `6`
    - _Requirements: 2.7_

  - [ ]* 6.8 Write the release smoke checks
    - `app.json` declares 0.3.0 / 6; `apps/mobile/package.json` gained no dependency outside the 0.2.3 set; the three roadmap route files exist only under `/api/roadmap`
    - _Requirements: 2.5, 2.7, 16.3_

  - [ ] 6.9 Checkpoint - release candidate
    - Ensure all tests pass, ask the user if questions arise. Run the on-device checks M1-M17 from the design's Testing Strategy on a physical device and record the results in the task notes before promoting the build.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, **except 1.6** — the two profile regression tests are the only guard on the single live surface this release changes, so they are a required sub-task rather than an optional one.
- Tasks 1-4 touch `apps/web` only and can land during closed testing. Tasks 5-6 wait for 0.2.3 to reach production.
- Each task is independently verifiable: 1 by the web suite plus the Neon branch record, 2 and 3 by the engine and route suites, 4 by the narration suite plus one live call, 5 and 6 by the Node-side mobile tests plus the on-device checklist.
- No task leaves an existing route broken. `PUT /api/profile` is rewritten and re-tested inside task 1; `PROFILE_FIELDS` and `/api/profile/match` are never edited; every other route is new.
- One property, one test, minimum 100 iterations, each tagged `Feature: roadmap, Property N: <text>`.
- The on-device checks M1-M17 are developer verification steps, not coding tasks, which is why they appear in the final checkpoint rather than as their own task.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0,  "tasks": ["1.1", "1.2", "1.11", "3.1"] },
    { "id": 1,  "tasks": ["1.3", "1.4", "1.5", "2.1"] },
    { "id": 2,  "tasks": ["1.6", "1.7", "1.8", "1.9", "1.10", "1.12", "2.2", "2.14"] },
    { "id": 3,  "tasks": ["2.3", "2.4", "2.15", "3.2"] },
    { "id": 4,  "tasks": ["2.6", "2.7", "2.8", "3.3", "3.4"] },
    { "id": 5,  "tasks": ["2.9", "2.10", "3.5", "3.6", "3.7"] },
    { "id": 6,  "tasks": ["2.5", "2.11", "2.12"] },
    { "id": 7,  "tasks": ["2.13", "2.16", "3.8"] },
    { "id": 8,  "tasks": ["3.9", "3.10", "3.11", "3.12", "3.13", "3.14"] },
    { "id": 9,  "tasks": ["3.15", "3.19", "3.22", "4.1"] },
    { "id": 10, "tasks": ["3.16", "3.17", "3.18", "3.20", "3.21", "4.2"] },
    { "id": 11, "tasks": ["4.3", "4.4"] },
    { "id": 12, "tasks": ["4.5", "4.6"] },
    { "id": 13, "tasks": ["5.1", "5.6"] },
    { "id": 14, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.9"] },
    { "id": 15, "tasks": ["5.7", "5.8"] },
    { "id": 16, "tasks": ["6.1", "6.3"] },
    { "id": 17, "tasks": ["6.2", "6.4", "6.5", "6.6"] },
    { "id": 18, "tasks": ["6.7"] },
    { "id": 19, "tasks": ["6.8"] }
  ]
}
```
