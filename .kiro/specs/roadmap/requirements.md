# Requirements Document

## Introduction

The AI Personalized Roadmap is a scored, profile-driven journey in the BairePorbo mobile app that tells a student where they stand, what to do next in order, and the single highest-impact action available today. It connects the existing CV builder, scholarship catalogue, guides and AI mentor into one spine.

The readiness score, the milestone set and the strength and weakness lists are owned by a deterministic, versioned TypeScript engine in `apps/web/src/lib/roadmap/`. The AI is a narrator only: it phrases explanations in English and Bangla and is constrained to a whitelist of keys supplied by the engine. The AI can neither change the score nor add or remove milestones, strengths or weaknesses. This boundary exists because a score students screenshot must be stable, explainable and unit-testable, and because a promise like "42% → 58%" must be arithmetic — computed by re-running the score with the milestone's evidence actually in place — rather than guessed.

Two rules run through the whole document. The first is that recording a status is not the same as doing the work: a self-reported completion advances the path and unlocks the next milestone, and awards zero points in every pillar. Only stored profile values, stored document statuses and stored application artefacts move the score, so no sequence of status writes can raise readiness. The second is that unknown is not zero: a profile the engine knows too little about reports readiness as `null` rather than as 0, and an unknown input lowers confidence rather than producing a weakness.

This is v1 scope. The Android app is live in Play closed testing (0.2.3 / versionCode 5, package `app.baireporbo.android`), the web app serves real traffic, and Neon Postgres is the production database. A material share of these requirements therefore constrains what the feature is allowed to do to already-shipped clients and already-stored data.

Scope boundaries for v1: five country paths plus a generic fallback; roughly 10-12 milestone catalog entries; six scoring pillars; up to three derived strengths and three derived weaknesses; three tables; zero new native dependencies; a 3-step onboarding wizard; visual completion feedback. Out of scope: gamification (XP, streaks, badges, shareable cards), analytics event tables, cron push nudges, a web roadmap page, offline replay, document file uploads (status only), and application tracking — the Application_Progress pillar reads bookmark count in v1 because no table stores submitted applications.

## Glossary

**Engine and data**

- **Roadmap_Engine**: the deterministic, versioned module set under `apps/web/src/lib/roadmap/` (`types.ts`, `inputs.ts`, `scoring.ts`, `catalog.ts`, `country-rules.ts`, `graph.ts`, `fingerprint.ts`). Composed of pure functions with no database, network or clock access other than an explicitly passed timestamp.
- **Scoring_Module**: the part of the Roadmap_Engine that maps normalized inputs to a Readiness value and a Score_Breakdown.
- **Graph_Builder**: the part of the Roadmap_Engine that filters, auto-satisfies, dependency-orders and date-plans the milestone set.
- **Milestone_Catalog**: the static, country-independent definition set of Milestones, keyed by Milestone_Key.
- **Country_Rules**: the per-country milestone additions and parameter overrides, plus the Generic_Path.
- **Generic_Path**: the country-independent milestone path used when no Country_Rules entry matches the student's Target_Country.
- **Fingerprint_Module**: the part of the Roadmap_Engine that produces a stable SHA-256 Profile_Fingerprint over normalized inputs and ENGINE_VERSION.
- **Narrator**: `apps/web/src/lib/roadmap/narrate.ts`, the single AI call plus the validator that constrains the model's output.
- **ENGINE_VERSION**: an integer constant in the Roadmap_Engine, incremented whenever scoring weights, catalog content or ordering rules change.
- **Milestone**: one step of the journey, identified by a Milestone_Key, carrying bilingual title and description, stage, estimated duration, dependencies, priority and an action target.
- **Milestone_Key**: a stable lowercase string identifier for a Milestone (for example `passport`, `ielts`, `sop`, `aps_germany`), never reused for a different Milestone across ENGINE_VERSION values.
- **Readiness**: an integer from 0 to 100 produced by the Scoring_Module.
- **Score_Breakdown**: the per-Pillar earned and available points that sum to Readiness.
- **Pillar**: one of the six weighted scoring dimensions — Academics (20), English (20), Documents (25), Research (15), Experience (10), Application_Progress (10).
- **Evidence_Requirement**: the stored profile value or stored application artefact that a given Milestone_Key requires before that Milestone's completion can move any Pillar — for example the `profiles.ielts_score` value for `ielts`, a `user_cvs` row for `cv`, a Docs_Map entry for `sop`. A Milestone_Key may carry no Evidence_Requirement (for example `passport`); such a Milestone moves no Pillar and exists for sequencing, and contributes to the Documents Pillar only where a Docs_Map entry backs it.
- **Confidence**: an integer from 0 to 100 describing how much of the Scoring_Module's required input set holds a known value.
- **Confidence_Floor**: the Confidence value 40, below which the Roadmap_Route reports Readiness as unestablished. Clearing the Confidence_Floor is necessary but not sufficient: Requirement 5 additionally requires the `degree` and `cgpa` inputs to hold known values before Readiness is reported as an integer.
- **Readiness_Gate**: the conjunction of Confidence being at or above the Confidence_Floor and the `degree` and `cgpa` inputs both holding known values. The Roadmap_Route reports Readiness as an integer only while the Readiness_Gate is satisfied.
- **Strength**: a derived observation, carrying a stable Strength_Key, that one Pillar earned a high share of its available points.
- **Weakness**: a derived observation, carrying a stable Weakness_Key, that one Pillar earned a low share of its available points from inputs that all hold known values, or that one named Evidence_Requirement is absent while the Milestone it gates is otherwise reachable.
- **Strength_Key** and **Weakness_Key**: stable lowercase string identifiers for one derived Strength or Weakness (for example `strong_cgpa`, `no_english_test`), supplied to the Narrator as a whitelist in the same way as Milestone_Keys.
- **Feasibility**: one of `on-track`, `tight`, `not-feasible`, derived by comparing the sum of remaining Milestone durations against Time_To_Intake.
- **Time_To_Intake**: the number of Dhaka_Day boundaries between today and the first day of the student's Target_Intake.
- **Dhaka_Day**: a calendar day in Asia/Dhaka (UTC+6), computed with the `DHAKA_OFFSET_MS` local-midnight approach already used by `apps/web/src/app/api/cron/push-digest/route.ts`.
- **Target_Country**: the single country the student is planning for, stored in `profiles.target_country`.
- **Target_Intake**: the term and year the student is applying for, stored in `profiles.target_intake_term` and `profiles.target_intake_year`.
- **Docs_Map**: the `profiles.docs` JSONB object holding per-document status values, validated against a server-side allow-list.
- **Auto_Satisfaction**: the Graph_Builder marking a Milestone complete because stored profile data or a stored application artefact already proves completion.
- **Manual_Override**: the `milestone_progress.manual_override` boolean recording that the student's own status choice takes precedence over Auto_Satisfaction.
- **Narration_Status**: one of `pending`, `ready`, `failed`, stored on the `roadmaps` row.

**Routes and migrations**

- **Profile_Route**: `apps/web/src/app/api/profile/route.ts` (`GET` and `PUT`).
- **Dashboard_Route**: `apps/web/src/app/api/dashboard/route.ts`.
- **Match_Route**: `apps/web/src/app/api/profile/match/route.ts`.
- **Roadmap_Route**: `GET /api/roadmap`.
- **Generate_Route**: `POST /api/roadmap/generate`.
- **Milestone_Route**: `PATCH /api/roadmap/milestones/[key]`.
- **Migration_026**: `apps/web/supabase/migrations/026_ai_roadmap.sql`.
- **Neon_Branch**: a Neon copy-on-write branch created from the production database for pre-production verification.

**Clients**

- **Shipped_Client**: the mobile app already distributed as 0.2.3 / versionCode 5, whose profile save sends exactly the 15 keys `full_name`, `cgpa`, `work_experience`, `target_degree`, `preferred_countries`, `goals_notes`, `bsc_major`, `university`, `graduation_year`, `research_interests`, `published_papers`, `ielts_score`, `gre_gmat_score`, `internships`, `portfolio_url`.
- **Roadmap_Client**: the mobile release that first contains the roadmap surfaces, versioned 0.3.0 / versionCode 6.
- **Journey_Screen**: `apps/mobile/app/roadmap/index.tsx`.
- **Score_Breakdown_Card**: the expandable Readiness explanation on the Journey_Screen.
- **Onboarding_Wizard**: the 3-step setup flow rendered inside the `app/roadmap/` route group.
- **Milestone_Screen**: `apps/mobile/app/roadmap/milestone/[key].tsx`.
- **Home_Screen**: `apps/mobile/app/(tabs)/index.tsx`.
- **Completion_Feedback**: the visual response to marking a Milestone complete — score count-up, node fill, connector segment fill, next-node unlock, inline bilingual banner.
- **Chrome_Copy**: fixed interface strings held in `apps/mobile/src/i18n/translations.ts` and rendered through `useT()`.

## Requirements

### Requirement 1: Non-destructive profile updates

**User Story:** As a student running the already-installed app version, I want my saved profile to keep the roadmap answers I gave elsewhere, so that using an older app build does not erase my target country, intake, English test details or document checklist.

The Profile_Route today builds one full `UPDATE ... SET` that assigns every column from a destructured body with `?? null`. Extending that pattern with roadmap columns would make every save from a Shipped_Client silently clear them.

#### Acceptance Criteria

1. WHEN the Profile_Route receives a `PUT` request whose body omits a writable profile column key, THE Profile_Route SHALL leave the stored value of that column unchanged.
2. WHEN the Profile_Route receives a `PUT` request whose body contains a writable profile column key with the value `null` or the empty string, THE Profile_Route SHALL store `NULL` in that column.
3. WHEN the Profile_Route receives a `PUT` request carrying exactly the 15 keys sent by the Shipped_Client, THE Profile_Route SHALL return a profile in which `target_country`, `target_intake_term`, `target_intake_year`, `english_test_type`, `english_test_status`, `english_test_date` and `docs` hold the values stored before the request.
4. THE Profile_Route SHALL build the `SET` clause from the writable keys present in the request body and execute the statement through `sqlQuery(text, params)` with positional parameters.
5. WHEN the Profile_Route receives a `PUT` request containing a key that is absent from the writable-column allow-list, THE Profile_Route SHALL exclude that key from the `SET` clause and return HTTP 200.
6. WHEN the Profile_Route receives a `PUT` request whose body contains a `docs` object, THE Profile_Route SHALL store only the entries whose keys appear in the Docs_Map allow-list and whose values appear in the document status allow-list.
7. IF the Profile_Route receives a `PUT` request whose body contains no writable key, THEN THE Profile_Route SHALL return HTTP 400 with an error body and leave every column unchanged.
8. IF the Profile_Route receives a `PUT` request whose body contains `target_intake_year` outside the range 2025 to 2035, THEN THE Profile_Route SHALL return HTTP 400 and leave every column unchanged.
9. WHEN the Profile_Route receives a `PUT` request carrying a value for one of the 15 profile columns present as of version 0.2.3 that the version 0.2.3 handler would have accepted, THE Profile_Route SHALL store the coerced value and SHALL NOT reject the request, so that a stored value outside a range the current handler would prefer — a `cgpa` of 85 entered as a percentage, a `graduation_year` of 2040 — cannot make every subsequent save of a whole-row body fail.

### Requirement 2: Preservation of live surfaces

**User Story:** As an existing web user, I want the numbers and matches I already see to stay the same after the roadmap ships, so that a new mobile feature does not degrade my dashboard or my scholarship recommendations.

#### Acceptance Criteria

1. THE Dashboard_Route SHALL compute readiness from exactly the 14 profile field keys present in `PROFILE_FIELDS` as of version 0.2.3.
2. WHEN a profile holds values in the new roadmap columns, THE Dashboard_Route SHALL return the same readiness value that the same profile produced before Migration_026.
3. THE Match_Route SHALL build embedding text by reading an explicit enumerated list of named profile fields rather than by iterating over the keys of the row returned by `SELECT * FROM profiles`, so that a column added by Migration_026 cannot enter the embedding text.
4. THE Match_Route SHALL gate sparse profiles on exactly the three fields `target_degree`, `preferred_countries` and `cgpa` present as of version 0.2.3.
5. THE Roadmap_Route, Generate_Route and Milestone_Route SHALL be reachable only at paths under `/api/roadmap`.
6. WHEN the Shipped_Client calls `GET /api/profile`, `GET /api/dashboard` or `GET /api/profile/match`, THE responding route SHALL return a body whose existing keys retain their 0.2.3 names and types.
7. WHERE the roadmap release changes `apps/mobile`, THE Roadmap_Client SHALL declare `expo.version` `0.3.0` and `expo.android.versionCode` `6`.

### Requirement 3: Additive migration and rollout safety

**User Story:** As the operator of a live database, I want the roadmap schema change to be incapable of blocking production queries or losing data, so that shipping the feature carries no downtime risk.

#### Acceptance Criteria

1. THE Migration_026 SHALL contain only `ADD COLUMN IF NOT EXISTS` statements for nullable columns without a `DEFAULT` and without `NOT NULL`, and `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements.
2. THE Migration_026 SHALL create exactly two tables, named `roadmaps` and `milestone_progress`.
3. THE Migration_026 SHALL execute inside a single transaction that sets `SET LOCAL lock_timeout = '3s'` and `SET LOCAL statement_timeout = '30s'` before the first schema statement.
4. IF a lock on `profiles` is unavailable within 3 seconds, THEN THE Migration_026 SHALL abort with an error and leave the schema unchanged.
5. WHEN the Migration_026 is applied a second time to the same database, THE Migration_026 SHALL complete without error and without altering any stored row.
6. THE Migration_026 SHALL be verified on a Neon_Branch created from production, with the Roadmap_Engine tests, the route tests and at least one live AI call executed against that branch, before the file is applied to production.
7. WHEN the roadmap feature is released, THE Migration_026 SHALL be applied to the production database before the application code that reads the new tables is deployed.
8. IF the roadmap release is rolled back, THEN THE rollback procedure SHALL revert the application deployment and retain every column and table created by Migration_026.

### Requirement 4: Deterministic readiness score

**User Story:** As a student, I want my readiness percentage to be the same every time I open the app for the same profile, so that I can trust the number, screenshot it, and understand exactly what produced it.

#### Acceptance Criteria

1. WHEN the Scoring_Module is called twice with identical inputs and an identical timestamp, THE Scoring_Module SHALL return an identical Readiness integer and an identical Score_Breakdown.
2. THE Scoring_Module SHALL distribute the 100 available points across exactly six Pillars weighted Academics 20, English 20, Documents 25, Research 15, Experience 10 and Application_Progress 10.
3. THE Scoring_Module SHALL return a Score_Breakdown whose per-Pillar earned points sum to the returned Readiness integer.
4. THE Roadmap_Engine SHALL execute in a test harness without a database connection, without an AI provider credential and without reading the system clock.
5. WHEN the Scoring_Module receives inputs whose Pillar weighting depends on `target_degree`, THE Scoring_Module SHALL apply the weighting registered for that degree level and record the applied weighting in the Score_Breakdown.
6. WHEN a stored profile field holds an unparseable value, THE Roadmap_Engine SHALL represent that field as unknown rather than as zero, and SHALL exclude the field from Confidence.
7. THE Fingerprint_Module SHALL return an identical Profile_Fingerprint for two input objects with identical values and differing key insertion order.
8. WHEN ENGINE_VERSION changes, THE Fingerprint_Module SHALL return a different Profile_Fingerprint for otherwise identical inputs.
9. THE Scoring_Module SHALL derive the Application_Progress Pillar points solely from the student's `user_bookmarks` row count, awarding 0 points for a count of 0, 3 points for a count of 1 to 2, 6 points for a count of 3 to 5, 8 points for a count of 6 to 9 and 10 points for a count of 10 or greater.
10. WHEN the `user_bookmarks` row count increases, THE Scoring_Module SHALL return Application_Progress points greater than or equal to the points returned for the lower count.

### Requirement 5: Honest handling of empty and partial profiles

**User Story:** As a student who has just signed up, I want the roadmap to tell me it does not know enough yet rather than judging me at 0%, so that an incomplete profile does not read as a verdict on my chances.

#### Acceptance Criteria

1. WHILE the Readiness_Gate is satisfied, THE Roadmap_Route SHALL return `readiness` as an integer from 0 to 100.
2. WHEN the Roadmap_Route builds a roadmap for a profile in which every Scoring_Module input is unknown, THE Roadmap_Route SHALL return `confidence` equal to 0 and `readiness` as `null`.
3. WHILE `readiness` is `null` AND Confidence is below the Confidence_Floor, THE Journey_Screen SHALL present the setup entry point in place of a Readiness percentage.
4. THE Journey_Screen and THE Home_Screen SHALL substitute the setup entry point for a Readiness percentage only while `readiness` is `null`.
5. WHILE `readiness` is an integer and `confidence` is below 80, THE Journey_Screen SHALL render the Readiness percentage together with a Confidence indicator and the name of the highest-weight unknown input.
6. WHEN a previously unknown Scoring_Module input receives a value, THE Scoring_Module SHALL return a Confidence value greater than or equal to the value returned before the input was known.
7. WHEN the Roadmap_Route builds a roadmap for a profile whose `target_country` is unknown, THE Graph_Builder SHALL return the Generic_Path and THE Roadmap_Route SHALL return `country_source` equal to `generic`.
8. WHEN `profiles.preferred_countries` lists more than one country and `target_country` is unknown, THE Graph_Builder SHALL return the Generic_Path and THE Journey_Screen SHALL render a prompt to choose a single Target_Country.
9. WHILE Confidence is below the Confidence_Floor, THE Roadmap_Route SHALL return `readiness` as `null`.
10. WHILE the `degree` input or the `cgpa` input holds an unknown value, THE Roadmap_Route SHALL return `readiness` as `null`, so that a profile carrying only the four answers the Onboarding_Wizard collects reports Readiness as unestablished rather than as a low percentage.
11. WHILE `readiness` is `null` AND Confidence is at or above the Confidence_Floor, THE Journey_Screen and THE Home_Screen SHALL render, in place of a Readiness percentage, a prompt naming the input that unlocks the Readiness percentage together with a control that opens the entry form for that input.

### Requirement 6: Projected impact and the single next action

**User Story:** As a student, I want to see the one action with the biggest effect on my readiness and exactly how many points it adds, so that I know where to spend my next hour.

#### Acceptance Criteria

1. WHEN the Scoring_Module is asked for the projected Readiness of a Milestone_Key, THE Scoring_Module SHALL return the Readiness produced by re-running the full scoring computation with that Milestone genuinely satisfied, including that Milestone's Evidence_Requirement, so that the projected value states the gain from performing the work rather than from recording a status.
2. THE Roadmap_Route SHALL return a `next_action` naming exactly one available Milestone_Key together with the current Readiness and the projected Readiness for that Milestone_Key.
3. THE Graph_Builder SHALL select `next_action` from the Milestones whose dependencies are all satisfied.
4. WHEN two available Milestones produce an equal projected Readiness gain, THE Graph_Builder SHALL select the Milestone with the earlier planned due date, and SHALL select the Milestone with the lower catalog priority index when the due dates are equal.
5. WHERE the completion's Evidence_Requirement is satisfied, WHEN a student marks the `next_action` Milestone complete, THE Milestone_Route SHALL return a `readiness` value equal to the projected Readiness the Roadmap_Route returned for that Milestone_Key before the change.
6. WHERE the completion's Evidence_Requirement is unsatisfied, WHEN a student marks a Milestone complete, THE Milestone_Route SHALL return a `readiness` value equal to the value returned before the request, a `delta` of 0, and the name of the Evidence_Requirement that would release the points.
7. WHERE a Milestone's Evidence_Requirement is unsatisfied at the time a student self-reports its completion, THE Roadmap_Route SHALL return the projected gain for that Milestone_Key as 0 together with the name of the stored value that would unlock the points.
8. WHEN any sequence of Milestone_Route status writes is applied to a profile whose stored values and stored application artefacts are unchanged, THE Roadmap_Route SHALL return a Readiness value equal to the Readiness returned before that sequence.

### Requirement 7: Derived strengths and weaknesses

**User Story:** As a student, I want to see what my profile already has going for it and what is actually holding it back, so that I know which part of my application to defend and which part to fix.

#### Acceptance Criteria

1. THE Scoring_Module SHALL derive at most 3 Strengths and at most 3 Weaknesses from the Score_Breakdown alone, each carrying a Strength_Key or a Weakness_Key drawn from a fixed identifier set.
2. WHEN a Pillar earns at least 70 percent of its available points, THE Scoring_Module SHALL derive a Strength for that Pillar.
3. WHEN a Pillar earns at most 30 percent of its available points AND every input that Pillar reads holds a known value, THE Scoring_Module SHALL derive a Weakness for that Pillar.
4. THE Scoring_Module SHALL derive at most one Weakness per Pillar, selecting the Weakness that names an absent Evidence_Requirement in preference to the Weakness that names the Pillar as a whole.
5. WHERE an input that a Pillar reads is unknown rather than deficient, THE Scoring_Module SHALL exclude that Pillar from the Weakness list and SHALL count that input toward Confidence and toward the prompt naming the highest-weight unknown input.
6. WHILE Readiness is `null`, THE Scoring_Module SHALL return an empty Weakness list, so that a profile the engine knows too little about receives no diagnosis.
7. THE Scoring_Module SHALL order the Strength list and the Weakness list by points at stake descending, then by Pillar weight descending, then by Strength_Key or Weakness_Key ascending.
8. WHEN the Scoring_Module is called twice with identical inputs and an identical timestamp, THE Scoring_Module SHALL return an identical Strength list and an identical Weakness list in an identical order.
9. THE Scoring_Module SHALL attach to each derived Weakness the Milestone_Key that resolves that Weakness.
10. WHEN a student activates a rendered Weakness, THE Journey_Screen SHALL navigate to the Milestone_Screen for the Milestone_Key attached to that Weakness.
11. THE Narrator SHALL phrase every supplied Strength_Key and Weakness_Key in English and in Bangla within the single model call that narrates the Milestones.
12. WHEN the model returns a Strength_Key or a Weakness_Key absent from the supplied list, THE Narrator SHALL discard that entry and retain the remainder of the response.
13. WHEN the model omits a supplied Strength_Key or Weakness_Key, or returns it with English text and no Bangla text, THE Narrator SHALL apply the per-key and per-language fallback and length-clamp rules that Requirement 13 defines for Milestone explanations.
14. THE Journey_Screen SHALL render the Strength list and the Weakness list, and WHILE Narration_Status is `pending` or `failed` THE Journey_Screen SHALL render both lists from Chrome_Copy keyed by Strength_Key and Weakness_Key.

### Requirement 8: Milestone catalog and country paths

**User Story:** As a student targeting a specific country, I want the steps that country actually requires, so that I am not surprised by an APS certificate or a blocked account three months before my intake.

#### Acceptance Criteria

1. THE Milestone_Catalog SHALL define between 10 and 12 Milestones, each carrying a unique Milestone_Key, an English title, a Bangla title, an English description, a Bangla description, a stage, an estimated duration in days, a dependency list and a priority index.
2. THE Country_Rules SHALL define paths for exactly five Target_Country values plus the Generic_Path.
3. THE five Target_Country values SHALL be selected from the observed distribution of `profiles.preferred_countries` in the production database, with Germany, Canada, USA, UK and Japan applying when that distribution provides no clearer ranking.
4. WHEN the Graph_Builder receives a Target_Country matching a Country_Rules entry, THE Graph_Builder SHALL include every Milestone that entry requires and SHALL exclude every Milestone whose `appliesTo` predicate rejects the inputs.
5. WHEN the Graph_Builder receives a Target_Country with no matching Country_Rules entry, THE Graph_Builder SHALL return the Generic_Path and every returned Milestone SHALL carry non-empty English and Bangla catalog copy.
6. WHEN the Graph_Builder builds a path for Germany, THE returned Milestone_Key list SHALL include the APS and blocked-account Milestone_Keys.
7. WHEN the Graph_Builder builds a path for Canada, THE returned Milestone_Key list SHALL include the proof-of-funds Milestone_Key.
8. THE Milestone_Catalog SHALL assign each Milestone an action target resolving to one of the CV builder, the scholarship discovery list, the AI mentor, a guide, or a data-entry form.

### Requirement 9: Ordering, due dates and feasibility honesty

**User Story:** As a student whose intake is four months away, I want to be told plainly when the remaining work no longer fits, so that I can target the next cycle instead of failing this one.

#### Acceptance Criteria

1. THE Graph_Builder SHALL return the Milestones in an order in which every Milestone appears after all Milestones listed in its dependency list.
2. IF the Milestone_Catalog dependency lists contain a cycle, THEN THE Graph_Builder SHALL raise an error identifying the participating Milestone_Keys.
3. WHEN the Graph_Builder receives a Target_Intake, THE Graph_Builder SHALL assign each Milestone a planned due date derived by subtracting the remaining downstream durations from the first Dhaka_Day of that Target_Intake.
4. THE Graph_Builder SHALL compute every day count from the Dhaka_Day boundary using the `DHAKA_OFFSET_MS` local-midnight approach.
5. WHEN the sum of the remaining Milestone durations is at most Time_To_Intake, THE Graph_Builder SHALL return Feasibility `on-track`.
6. WHEN the sum of the remaining Milestone durations exceeds Time_To_Intake and is at most Time_To_Intake plus 30 days, THE Graph_Builder SHALL return Feasibility `tight`.
7. WHEN the sum of the remaining Milestone durations exceeds Time_To_Intake plus 30 days, THE Graph_Builder SHALL return Feasibility `not-feasible`.
8. WHILE Feasibility is `not-feasible`, THE Journey_Screen SHALL render the next viable Target_Intake and a control that writes that Target_Intake through the Profile_Route.
9. WHEN the stored Target_Intake starts before the current Dhaka_Day, THE Graph_Builder SHALL return Feasibility `not-feasible` and the next Target_Intake of the same term in the following year.

### Requirement 10: Auto-satisfaction, manual override and anti-gaming

**User Story:** As a student, I want steps I have already finished to be recognised automatically, and I want the app to stop arguing with me when I disagree, while still not letting a checkbox stand in for a real test score.

#### Acceptance Criteria

1. WHEN stored profile data or a stored application artefact proves a Milestone complete, THE Graph_Builder SHALL mark that Milestone `done` with Auto_Satisfaction recorded as the source.
2. WHEN a student sets a Milestone status through the Milestone_Route, THE Milestone_Route SHALL store that status with `manual_override` set to `true`.
3. WHILE `manual_override` is `true` for a Milestone_Key, THE Graph_Builder SHALL retain the stored status even when Auto_Satisfaction would produce a different status.
4. WHEN a student marks a Milestone `done` while that Milestone's Evidence_Requirement is unsatisfied, THE Scoring_Module SHALL award 0 points in every Pillar for that completion, and THE Graph_Builder SHALL treat that Milestone as complete for dependency satisfaction and for ordering.
5. WHEN a student marks the English test Milestone `done` while `ielts_score` is unknown, THE Roadmap_Route SHALL return the English Pillar earned points as 0 and a prompt naming the score entry that unlocks the remaining points.
6. THE Scoring_Module SHALL derive every Pillar's points only from stored profile values, stored Docs_Map entries and stored application artefacts, and SHALL read no `milestone_progress` status value.
7. WHEN a student sets a Milestone status back to `todo`, THE Milestone_Route SHALL clear `completed_at` and retain `manual_override` as `true`.
8. WHERE a Milestone tracks a count, THE Milestone_Route SHALL accept a `progress` integer between 0 and that Milestone's target count and SHALL reject values outside that range with HTTP 400.

### Requirement 11: Progress durability

**User Story:** As a student who changed my target country and regenerated my roadmap, I want the steps I already completed to stay completed, so that experimenting with my plan never costs me my progress.

#### Acceptance Criteria

1. THE `milestone_progress` table SHALL key each row by the pair of user identifier and Milestone_Key.
2. WHEN a roadmap is regenerated for a user, THE Roadmap_Route SHALL leave every existing `milestone_progress` row unchanged.
3. WHEN a Target_Country change removes a Milestone_Key from the returned path, THE Roadmap_Route SHALL retain the `milestone_progress` row for that Milestone_Key.
4. WHEN a Target_Country change re-adds a previously removed Milestone_Key, THE Roadmap_Route SHALL return that Milestone with the status stored in its retained `milestone_progress` row.
5. WHEN ENGINE_VERSION changes, THE Roadmap_Route SHALL match stored progress to the new path by Milestone_Key.
6. WHEN the Roadmap_Route returns a Readiness value lower than the stored `previous_readiness`, THE Roadmap_Route SHALL return the stored `previous_readiness` together with the ENGINE_VERSION value stored alongside `previous_readiness`.
7. WHEN a Milestone_Key present in `milestone_progress` is absent from the Milestone_Catalog, THE Roadmap_Route SHALL exclude that row from the response and SHALL retain the row in the database.

### Requirement 12: Deterministic read path and caching

**User Story:** As a student, I want the roadmap to appear immediately when I open it, so that reading my plan never waits on an AI call.

#### Acceptance Criteria

1. THE Roadmap_Route SHALL construct the deterministic roadmap without issuing an outbound request to an AI provider.
2. WHILE the Roadmap_Engine constructs the deterministic roadmap, THE Roadmap_Engine SHALL issue no outbound network request, SHALL execute no database statement and SHALL read no system clock, verified by replacing the network, database and clock boundaries with recording stubs and asserting that none of them is called.
3. WHERE a performance benchmark measures the Roadmap_Engine, THE benchmark SHALL report the construction duration for a path of 12 Milestones without determining the outcome of the test suite.
4. WHEN the recomputed Profile_Fingerprint equals the stored `roadmaps.profile_fingerprint`, THE Roadmap_Route SHALL return the stored narration and the stored Narration_Status.
5. WHEN the recomputed Profile_Fingerprint differs from the stored `roadmaps.profile_fingerprint`, THE Roadmap_Route SHALL persist the recomputed deterministic roadmap with Narration_Status `pending` and return that roadmap.
6. THE Roadmap_Route SHALL persist the `roadmaps` row with a single statement that inserts on absence and updates on conflict of the user identifier.
7. WHEN two Roadmap_Route calls for the same user complete concurrently, THE `roadmaps` table SHALL hold exactly one row for that user.
8. THE Roadmap_Route SHALL respond with the header `Cache-Control: private, no-store`.
9. WHEN a request without a valid Clerk session reaches the Roadmap_Route, the Generate_Route or the Milestone_Route, THE receiving route SHALL return HTTP 401.
10. THE Roadmap_Route, the Generate_Route and the Milestone_Route SHALL scope every database statement by the user identifier returned from `getUser()`.

### Requirement 13: Constrained AI narration

**User Story:** As a student, I want the explanations to speak to my situation in my language, so that each step feels written for me rather than pulled from a generic list.

#### Acceptance Criteria

1. THE Narrator SHALL request the model `deepseek/deepseek-v4-flash-0731` through `fetchCompletion` with `json` set to `true`, `reasoning` set to `{ enabled: false }`, `temperature` `0.3` and `timeoutMs` `25000`.
2. THE Narrator SHALL produce English and Bangla text for every narrated field in a single model call.
3. THE Narrator SHALL include in the system prompt the exact list of Milestone_Keys present in the current path, the exact list of derived Strength_Keys and the exact list of derived Weakness_Keys, together with the instruction to use only those keys.
4. WHEN the model returns a Milestone_Key absent from the supplied list, THE Narrator SHALL discard that entry and retain the remainder of the response.
5. WHEN the model omits a supplied Milestone_Key, THE Narrator SHALL use the Milestone_Catalog copy for that Milestone_Key and retain the model's text for the remaining keys.
6. WHEN the model returns a field with English text and no Bangla text, THE Narrator SHALL use the English text for the Bangla rendering of that field and retain the Bangla text of the remaining fields.
7. THE Narrator SHALL truncate each per-Milestone explanation to 240 characters and the mentor paragraph to 320 characters.
8. THE Narrator SHALL enclose `goals_notes` and `research_interests` in a delimited data block carrying an instruction to treat the enclosed content as data rather than as instructions.
9. WHEN the enclosed free text contains an instruction to change the Milestone set or the Readiness value, THE Narrator SHALL return a narration whose Milestone_Key set equals the supplied list.
10. IF the first model attempt returns unparseable content or exceeds the timeout, THEN THE Narrator SHALL retry once with the model choice `deepseek`.
11. THE Generate_Route SHALL limit narration requests to 10 per hour per user identifier through `checkRateLimit` and SHALL return HTTP 429 with a `Retry-After` header beyond that limit.
12. WHEN the Generate_Route completes a narration, THE Generate_Route SHALL store the narration, the Profile_Fingerprint, the model identifier and Narration_Status `ready` on the `roadmaps` row.

### Requirement 14: Graceful degradation without AI

**User Story:** As a student using the app while the AI provider is unavailable, I want the whole roadmap to still work, so that an outage costs me phrasing rather than my plan.

#### Acceptance Criteria

1. WHILE `OPENROUTER_API_KEY` is unset, THE Roadmap_Route SHALL return a complete roadmap containing the Readiness value, the Score_Breakdown, the ordered Milestones, the planned due dates, the Feasibility value and the `next_action`.
2. WHILE `OPENROUTER_API_KEY` is unset, THE Roadmap_Route SHALL return Narration_Status `failed`.
3. WHEN both Narrator attempts fail, THE Generate_Route SHALL return HTTP 200 with Narration_Status `failed`.
4. WHILE Narration_Status is `failed` or `pending`, THE Journey_Screen SHALL render every Milestone using Milestone_Catalog copy in the active language.
5. WHILE Narration_Status is `failed`, THE Journey_Screen SHALL render a control that calls the Generate_Route.
6. THE Journey_Screen SHALL render the Readiness value and the Milestone list without waiting for a Generate_Route response.
7. IF the Generate_Route returns HTTP 429, THEN THE Journey_Screen SHALL retain the currently rendered roadmap and render the retry interval.

### Requirement 15: Onboarding wizard

**User Story:** As a new student, I want a short guided setup that asks only what the roadmap needs, so that I get a personalised plan in under two minutes.

#### Acceptance Criteria

1. THE Onboarding_Wizard SHALL collect Target_Country and Target_Intake in step 1, English test type, status and date in step 2, and Docs_Map entries in step 3.
2. THE Onboarding_Wizard SHALL write every collected answer through `PUT /api/profile`.
3. THE Onboarding_Wizard SHALL render inside the `app/roadmap/` route group.
4. WHEN a student leaves the Onboarding_Wizard after completing a step, THE Onboarding_Wizard SHALL render the first incomplete step on the next entry.
5. WHEN a student completes step 3, THE Onboarding_Wizard SHALL write `roadmap_onboarded_at` and navigate to the Journey_Screen.
6. IF a required field in the current step holds no value, THEN THE Onboarding_Wizard SHALL retain the current step and render a message naming the missing field.
7. WHILE `roadmap_onboarded_at` holds a value, THE Journey_Screen SHALL render the roadmap in place of the Onboarding_Wizard, and this condition SHALL decide only which screen the `app/roadmap/` route group renders on entry, leaving the substitution of the setup entry point for a percentage to Requirements 5.3 and 5.4.
8. THE Onboarding_Wizard SHALL render every fixed interface string from Chrome_Copy in both `en` and `bn`.

### Requirement 16: Journey screen presentation

**User Story:** As a student, I want one screen that shows where I stand and the ordered path ahead, so that I can see the whole plan without feeling buried by it.

#### Acceptance Criteria

1. THE Journey_Screen SHALL render the Milestones as a vertical timeline whose connector uses `expo-linear-gradient`.
2. WHILE `readiness` is an integer, THE Journey_Screen SHALL render Readiness as a horizontal gradient progress bar of the same construction used by the Home_Screen readiness bar.
3. THE Roadmap_Client SHALL declare no dependency that requires a native module absent from version 0.2.3.
4. THE Journey_Screen SHALL render each Milestone in exactly one of the states `done`, `active`, `locked` or `skipped`.
5. WHILE `readiness` is an integer, THE Journey_Screen SHALL render the `next_action` Milestone with the current Readiness and the projected Readiness.
6. WHILE `readiness` is `null`, THE Journey_Screen SHALL render the `next_action` Milestone title without a percentage and without a projected percentage.
7. THE Score_Breakdown_Card SHALL render on the Journey_Screen as an expandable card presenting the six Pillars with earned and available points, and the Confidence value.
8. THE Journey_Screen SHALL render each Milestone node with an accessibility label, an accessibility role and an accessibility state reflecting the Milestone state.
9. THE Journey_Screen SHALL render every fixed interface string from Chrome_Copy and every explanation from the roadmap response.
10. WHEN the Journey_Screen mounts, THE Journey_Screen SHALL bring the `active` Milestone node into the visible viewport.
11. WHILE the roadmap request is in flight and no cached roadmap exists, THE Journey_Screen SHALL render a loading state.

### Requirement 17: Milestone detail and deep links

**User Story:** As a student looking at a step, I want to act on it immediately in the part of the app that does the work, so that the roadmap connects to the tools instead of describing them.

#### Acceptance Criteria

1. THE Milestone_Screen SHALL render the Milestone title, description, explanation, estimated duration, planned due date, priority and status control for the Milestone_Key in the route parameter.
2. WHEN a student activates the action on the CV Milestone, THE Milestone_Screen SHALL navigate to the CV builder route.
3. WHEN a student activates the action on the shortlist Milestone, THE Milestone_Screen SHALL navigate to the scholarship discovery list with the filters derived from Target_Country and `target_degree` applied.
4. WHEN a student activates the action on a writing Milestone, THE Milestone_Screen SHALL open the AI mentor with a seeded prompt passed through `chat-handoff.ts`.
5. WHEN a student activates the action on a test-preparation Milestone, THE Milestone_Screen SHALL navigate to the guide identified by the Milestone's action target.
6. IF the route parameter names a Milestone_Key absent from the current roadmap, THEN THE Milestone_Screen SHALL render a not-found state and a control returning to the Journey_Screen.
7. WHEN a student changes a Milestone status on the Milestone_Screen, THE Milestone_Screen SHALL call the Milestone_Route and invalidate the roadmap query.

### Requirement 18: Home surface integration

**User Story:** As a student opening the app, I want one clear percentage and one clear next step on the home screen, so that two competing readiness numbers never confuse me.

#### Acceptance Criteria

1. THE Home_Screen SHALL render a roadmap quick-action card in the grid position occupied by the scholarships quick-action card in version 0.2.3.
2. THE Home_Screen SHALL retain the CV builder quick-action card.
3. WHILE `readiness` is an integer, THE Home_Screen SHALL render the roadmap Readiness value and the `next_action` Milestone title on the roadmap card.
4. THE Home_Screen SHALL render no more than one percentage value.
5. THE Home_Screen SHALL omit the profile completeness card present in version 0.2.3.
6. WHEN a student activates the roadmap card, THE Home_Screen SHALL navigate to the Journey_Screen.
7. WHILE `readiness` is `null`, THE Home_Screen SHALL render the setup prompt on the roadmap card in place of a percentage.
8. THE bottom tab set SHALL contain the same tabs as version 0.2.3.

### Requirement 19: Completion feedback and reactivity

**User Story:** As a student who just finished a step, I want the app to show me the progress I made, so that completing work feels worth returning for.

#### Acceptance Criteria

1. WHEN the Milestone_Route returns a Readiness value greater than the previously rendered value, THE Completion_Feedback SHALL animate the rendered Readiness from the previous value to the returned value.
2. WHEN a Milestone becomes `done`, THE Completion_Feedback SHALL fill that Milestone node and the connector segment preceding the following Milestone.
3. WHEN a Milestone completion satisfies the last dependency of a following Milestone, THE Completion_Feedback SHALL render that following Milestone in the `active` state.
4. WHEN a Milestone completion is rendered, THE Completion_Feedback SHALL render an inline banner in the active language stating the Milestone completed and the Readiness change.
5. WHEN the Milestone_Route records a completion for a Milestone_Key whose `celebrated_at` holds no value, THE Milestone_Route SHALL set `celebrated_at` and return `celebrate` as `true`.
6. WHEN the Milestone_Route records a status change for a Milestone_Key whose `celebrated_at` holds a value, THE Milestone_Route SHALL return `celebrate` as `false`.
7. WHILE the operating system reports reduce-motion as enabled, THE Completion_Feedback SHALL render the end state of each transition without animation.
8. WHEN a profile save, a CV save or a bookmark change succeeds, THE Roadmap_Client SHALL invalidate the roadmap query.
9. WHEN the Milestone_Route returns a response, THE Roadmap_Client SHALL invalidate the roadmap query and the dashboard query.
