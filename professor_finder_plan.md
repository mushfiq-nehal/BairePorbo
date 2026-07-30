# BairePorbo — "Find a Professor in Your Field" Implementation Plan

> Goal: let a student find **professors whose research overlaps their own work**, at
> universities where BairePorbo already lists fundable scholarships, and hand them a
> personalised first-contact email they send **from their own inbox**.
>
> Replaces the current manual grind: university site → department page → faculty list →
> Google Scholar → hunt for an email → guess whether they're relevant.
>
> **Strategic framing:** the differentiator is not professor search (Google Scholar exists).
> It is closing the loop **scholarship → supervisor → outreach → application**, for the
> destination countries where contacting a supervisor *before* applying is mandatory
> (Japan/MEXT, China/CSC, South Korea, Germany/DAAD, Taiwan).
>
> Status: planning — not started. Last updated: 2026-07-29.

---

## 0. Context — what we build against

- **DB:** Neon Postgres + pgvector. **No ORM** — raw SQL via `@neondatabase/serverless`
  (`apps/web/src/utils/db.ts`). Migrations are numbered files in
  `apps/web/supabase/migrations/` (currently at `025_*`). This feature adds `026`–`029`.
- **There is no `universities` table.** University identity today is:
  - `profiles.university` — free text, student's own institution.
  - LLM-extracted `university_name` written into **`scholarships.thumbnail_prompt`**
    (see `apps/web/src/app/api/admin/scholarships/[id]/enrich/route.ts:20`) — a repurposed
    column, and the prompt conflates *funder* with *host university* ("`University of
    Oxford`, `DAAD`, `Chevening Secretariat`"). **This is the root blocker.**
- **The semantic-match pattern already exists and should be copied, not reinvented:**
  `ScholarshipDoc(content, embedding VECTOR(1024), metadata)` + HNSW cosine index +
  `match_scholarship_docs()` RPC, consumed by `GET /api/profile/match`. Embeddings come
  from NVIDIA NIM `nvidia/nv-embedqa-e5-v5`; chunking lives in `apps/web/src/lib/rag-ingest.ts`.
- **Student-side signal already collected:** `profiles.research_interests`,
  `published_papers`, `bsc_major`, `target_degree`, plus parsed CVs in `user_cvs` /
  `cv_analyses`. This is the input to matching — no new intake schema strictly required.
- **Deploy:** Vercel (Next.js API routes, `maxDuration` ≤ 180s), **one** cron
  (`/api/cron/push-digest`, `vercel.json`). No queue, no worker, no workflow engine.
  → **Bulk ingestion cannot live in a request handler.** See §6.
- **Auth:** Clerk. **No transactional email provider** (Clerk only) — which is fine,
  because we deliberately never send outreach mail ourselves (§9).
- Clients: `apps/web` (Next.js) and `apps/mobile` (Expo), sharing types via
  `packages/shared`.

---

## 1. The feature, from the student's side

1. Student opens **Find Professors**. We derive their research fingerprint from their
   profile + CV; if it's thin, we prompt for a thesis abstract or topic picks (§5.4).
2. They get a ranked list of professors. Each card shows:
   - name, rank, department, university, country
   - **research topic tags** (canonical, from OpenAlex taxonomy)
   - **the specific paper that matched**, with year — not just a score
   - a one-sentence LLM explanation of the overlap and where interests diverge
   - `last_verified_at` and a link to the **official faculty page**
   - **"3 scholarships you may be eligible for at this university"** + nearest deadline
3. Filters: country, university, degree level, topic, active-since year, has-scholarship.
4. **Draft email** → editable draft referencing that specific paper and the student's own
   work → **opens in the student's own mail client** via `mailto:` / copy-to-clipboard.
5. Outreach tracker: drafted → sent → replied, with notes. Doubles as retention and gives
   us reply-rate data nobody else has.

**Non-goals for v1:** sending mail from our infrastructure, professors logging in,
recommending advisors outside the covered university set, ranking by prestige.

---

## 2. Data sources

| Source | Licence | What we take | Notes |
|---|---|---|---|
| **OpenAlex** `/institutions` | **CC0** | ROR id, canonical name, `display_name_alternatives` (→ aliases), country, city, homepage, type, `works_count`, `cited_by_count` | Seeds the universities table. Filter `type:education`, `works_count:>1000` → ~7–8k rows, covers every realistic target |
| **OpenAlex** `/authors`, `/works` | **CC0** | author id, name, affiliations, ORCID, `summary_stats` (h-index), `topics` (scored, 4-level hierarchy), works with title/abstract/year/DOI/venue | The professor + tag corpus. **Same institution ids as above → the university↔professor join is free by construction** |
| **OpenAlex topics** | **CC0** | domain → field → subfield → topic | **This is our tag taxonomy.** Do *not* let an LLM invent tags — that's how you get "ML", "Machine Learning", and "machine-learning" as three tags |
| **ORCID public API** | CC0 | current affiliation, self-reported employment | Freshness cross-check; catches recent moves |
| **Hipolabs university-domains-list** | Open | university → web domain(s) | Logos (favicon/OG → R2, reuse `migrate-images-to-r2.mjs`), academic email-domain sanity checks |
| Faculty pages | — | profile URL, "accepting students", email | **Manual/targeted only.** Never a general crawler — see §10 |
| QS / THE rankings | ❌ **not redistributable** | — | Use OpenAlex `works_count` / `cited_by_count` as a legally clean prominence proxy |

**OpenAlex operating limits:** ~10 req/s, 100k req/day, polite pool requires a `mailto`
in the query or User-Agent. Deep paging via `cursor=*`, 200 records/page. Seeding 8k
institutions ≈ 40 requests.

**Deliberate decision: no faculty-directory scraper.** Every university has different
HTML, parsers break constantly, and it buys us nothing OpenAlex doesn't already have
except email — the one field we've chosen not to bulk-collect anyway (§9, §10).

---

## 3. Schema

Four migrations. Raw SQL, matching existing style.

### `026_universities.sql` — the foundation

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE universities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT UNIQUE NOT NULL,          -- SEO pages, §8.3
  name           TEXT NOT NULL,
  ror_id         TEXT UNIQUE,
  openalex_id    TEXT UNIQUE,                   -- e.g. I12345
  country        TEXT NOT NULL,
  country_code   TEXT,
  city           TEXT,
  website        TEXT,
  domains        TEXT[] DEFAULT '{}',
  logo_url       TEXT,                          -- R2/CDN
  works_count    INTEGER,                       -- prominence proxy
  is_covered     BOOLEAN NOT NULL DEFAULT FALSE,-- professors ingested?
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learned aliases: every resolved messy string is written back here so the
-- matcher gets smarter and the review queue shrinks toward zero (§4).
CREATE TABLE university_aliases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  alias          TEXT NOT NULL,
  source         TEXT,                          -- 'openalex' | 'admin' | 'matcher'
  UNIQUE (university_id, alias)
);
CREATE INDEX universities_name_trgm  ON universities USING GIN (name gin_trgm_ops);
CREATE INDEX university_aliases_trgm ON university_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX universities_country_idx ON universities (country);

-- Separate funders from host universities — DAAD/MEXT/CSC are NOT universities.
CREATE TABLE funders (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  slug     TEXT UNIQUE NOT NULL,
  country  TEXT,
  website  TEXT
);

ALTER TABLE scholarships
  ADD COLUMN funder_id       UUID REFERENCES funders(id),
  ADD COLUMN university_id   UUID REFERENCES universities(id),  -- single-host shortcut
  ADD COLUMN scope           TEXT DEFAULT 'unknown'
    CHECK (scope IN ('single_university','consortium','country_wide','unknown')),
  ADD COLUMN uni_match_status TEXT DEFAULT 'pending'
    CHECK (uni_match_status IN ('pending','auto','confirmed','not_applicable'));

CREATE TABLE scholarship_universities (       -- consortium / multi-host
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE,
  university_id  UUID REFERENCES universities(id) ON DELETE CASCADE,
  PRIMARY KEY (scholarship_id, university_id)
);
```

> **Why `scope` matters more than it looks:** MEXT, CSC, DAAD and Erasmus Mundus are
> `country_wide` — the student picks the host institution. Those are simultaneously our
> most important scholarships *and* the ones where supervisor contact is mandatory. With
> `scope = 'country_wide'` we resolve eligible universities dynamically from
> country + degree level, so **the professor feature works for MEXT/CSC applicants on day
> one with zero hand-linking.**

### `027_professors.sql`

```sql
CREATE TABLE research_topics (               -- OpenAlex taxonomy, verbatim
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openalex_id    TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  subfield       TEXT,
  field          TEXT,
  domain         TEXT,
  slug           TEXT UNIQUE
);

CREATE TABLE professors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id       UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  openalex_author_id  TEXT UNIQUE,
  orcid               TEXT,
  full_name           TEXT NOT NULL,
  slug                TEXT,
  rank                TEXT,                  -- Professor / Associate / Assistant …
  department          TEXT,
  profile_url         TEXT,                  -- official faculty page → we link here
  homepage_url        TEXT,
  h_index             INTEGER,
  works_count         INTEGER,
  last_active_year    INTEGER,               -- recency gate (§5.2)
  accepting_students  BOOLEAN,               -- nullable = unknown
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','moved','opted_out')),
  source_url          TEXT,                  -- provenance, required (§10)
  fetched_at          TIMESTAMPTZ,
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professor_topics (              -- ← the "tags" from the original idea
  professor_id  UUID REFERENCES professors(id) ON DELETE CASCADE,
  topic_id      UUID REFERENCES research_topics(id) ON DELETE CASCADE,
  score         REAL,
  recent_year   INTEGER,
  PRIMARY KEY (professor_id, topic_id)
);

CREATE TABLE professor_works (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  UUID REFERENCES professors(id) ON DELETE CASCADE,
  openalex_id   TEXT,
  title         TEXT NOT NULL,
  abstract      TEXT,
  year          INTEGER,
  doi           TEXT,
  venue         TEXT,
  url           TEXT,
  citations     INTEGER
);
CREATE INDEX professor_works_prof_year ON professor_works (professor_id, year DESC);
```

### `028_professor_embeddings.sql`

```sql
CREATE TABLE professor_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  UUID REFERENCES professors(id) ON DELETE CASCADE,
  work_id       UUID REFERENCES professor_works(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('work','profile','cluster')),
  year          INTEGER,
  embedding     VECTOR(1024)                 -- see §6.2 re: halfvec
);
CREATE INDEX professor_embeddings_hnsw
  ON professor_embeddings USING hnsw (embedding vector_cosine_ops);
```

### `029_outreach.sql`

```sql
CREATE TABLE professor_matches (             -- cache: never regenerate LLM text per view
  user_id       TEXT NOT NULL,
  professor_id  UUID REFERENCES professors(id) ON DELETE CASCADE,
  score         REAL,
  top_work_id   UUID REFERENCES professor_works(id),
  reason        TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, professor_id)
);

CREATE TABLE outreach_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  professor_id  UUID REFERENCES professors(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'drafted'
                  CHECK (status IN ('drafted','sent','replied','rejected','no_response')),
  draft_body    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Resolving the existing scholarship backlog (§the blocker)

Universities come from OpenAlex, so the only real work is mapping **our existing free-text
strings** onto them.

**Step 0 — fix the concept split.** Update the enrich / bulk-import prompts
(`enrich/route.ts:20`, `bulk/process-item/route.ts:57`) to emit **three** fields instead of
one `university_name`: `funder_name`, `host_university_names[]`, `scope`. Stop writing
university identity into `thumbnail_prompt`.

**Step 1 — resolution pipeline** (per scholarship string):

1. **Exact alias hit** on `university_aliases` → done.
2. **Normalise** — `unaccent` (Technische Universität München), lowercase, strip leading
   "The", normalise "Univ."/"Univ"/"University".
3. **Block by country.** We already store `scholarships.country`. This cuts candidates
   from ~8,000 to ~50 and kills most false positives. *This single step beats any clever
   algorithm.*
4. **Trigram rank** — `pg_trgm` `similarity()` over `name` + aliases (GIN-indexed).
   Resolves the large majority.
5. **Embedding fallback** (reuse NIM) for translated/restructured names trigram misses
   — "Nihon University" vs "日本大学", "KTH" vs "Royal Institute of Technology".
6. **Admin review queue** for the uncertain band → three one-click candidate buttons in
   the existing admin CMS.
7. **Write the accepted alias back** to `university_aliases`.

> **Do not chase full automation.** Auto-accept above a high similarity threshold and
> review the rest. Even several hundred scholarships is well under an hour of clicking,
> and we get 100% accuracy instead of ~92%. Step 7 is what makes it compound: future bulk
> imports auto-resolve, so the queue shrinks over time instead of staying constant.

**Step 2 — stop the bleeding at the source.**

- Run resolution **inside the create/enrich/bulk path**, so new scholarships land with a
  `university_id` (or `uni_match_status='pending'`) at creation. Otherwise we re-run batch
  cleanup forever.
- Replace free-text **`profiles.university`** with a **typeahead** against `universities`.
  Small change now, another migration later if skipped. Also unlocks "students from your
  university who won this" as future social proof.

---

## 5. Matching

### 5.1 Embed works, not professors

Averaging a whole career into one vector makes a professor who works on five things into a
blurry vector that matches nothing well. Instead: embed each retained work
(title + abstract), match student → works, then roll up:

```
professor_score = 0.7 * best_work_score + 0.3 * mean(top_3_work_scores)
```

This also yields **which paper matched**, which is what makes the student's email credible
and the explanation trustworthy.

### 5.2 Recency weighting

A professor who published on the topic in 2014 and moved on is a bad match dressed as a
good one. Decay by publication year; gate on `last_active_year`.

### 5.3 Two layers, never one

1. **Hard filters:** country, degree level, `status='active'`, professor's university is
   `is_covered`, optionally has-eligible-scholarship.
2. **Semantic rank** within that set.
3. **LLM explanation pass** (existing OpenRouter setup) → `professor_matches.reason` +
   draft email. **Cache it**; never regenerate per page view.

Pure vector search over tens of thousands of professors with no filters surfaces
plausible-but-useless results.

### 5.4 Student-side cold start (the biggest quality risk)

Match quality is capped by input quality, and most students will have near-empty
`research_interests` / `published_papers`. Mitigations, in order:
- Pull from **`cv_analyses`** — already parsed, biggest lever, near-zero extra UX.
- A short **research-profile step**: paste thesis/project abstract.
- **Topic picker** over `research_topics` as fallback.
- If the fingerprint is still too thin, **say so** and offer topic-browse instead of
  returning garbage and letting the student conclude the feature is broken.

### 5.5 Embedding hygiene

`nv-embedqa-e5-v5` is asymmetric: professor works must be embedded as
`input_type: "passage"`, student fingerprints as `input_type: "query"`. Mirror whatever
`rag-ingest.ts` already does — getting this backwards silently degrades ranking.

---

## 6. Ingestion infrastructure

### 6.1 Not in a request handler

Pulling ~30 universities' professors plus their works is a multi-hour batch job; Vercel
caps at 180s. Run it as an **offline CLI script writing straight to Neon** — same shape as
`apps/web/scripts/reingest-scholarships.ts` (`pnpm reingest`) — optionally promoted to a
scheduled **GitHub Action** for quarterly re-sync. Add:

```
apps/web/scripts/seed-universities.ts       # OpenAlex /institutions → universities
apps/web/scripts/resolve-scholarship-unis.ts# backlog matcher (§4)
apps/web/scripts/ingest-professors.ts       # per-university, resumable, --university=slug
apps/web/scripts/embed-professors.ts        # batched NIM embedding
```

All must be **idempotent and resumable** (checkpoint by university + cursor); OpenAlex
paging over 30 universities will hit transient failures.

### 6.2 Two hard constraints to settle *before* ingesting

**Embedding throughput — batch or it will not finish.** NIM free tier is ~40 req/min. At
~30 universities × ~1,000 real faculty × 8 retained works ≈ **240k vectors**, one request
per vector is ~100 hours. Batching ~32 inputs per request → ~7.5k requests ≈ **3 hours**.
Batching is not an optimisation here, it's a prerequisite.

**Vector storage.** 240k × 1024 dims × 4 bytes ≈ **1 GB**, before the HNSW index, which
wants to live in RAM. On a small Neon plan that will bite. Options: cap retained works to
~8 (most recent + most cited), cluster to 3–5 vectors per professor instead of per work,
or use **`halfvec`** (2 bytes/dim, ~500 MB) — verify the pgvector version on our Neon
instance supports it. **Decide before ingesting, not after.**

### 6.3 Scale targets

| Stage | Rows |
|---|---|
| Universities seeded | ~7–8k (`type:education`, `works_count>1000`) |
| Universities *covered* (professors ingested), v1 | **25–30** |
| Professors, v1 | ~25–30k |
| Works retained | ~8 per professor |

Filter OpenAlex authors hard — raw institution author lists include every one-off
co-author. Require recent works *at that institution* plus a minimum `works_count`.

---

## 7. API surface

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/universities` | public | Typeahead + filters; `?covered=true`, `?country=` |
| `GET /api/universities/[slug]` | public | Detail: professors, topics, linked scholarships |
| `GET /api/professors` | public | Browse/filter by topic, country, university |
| `GET /api/professors/[id]` | public | Detail + works + topics + faculty-page link |
| `GET /api/professors/match` | auth | **Core.** Ranked matches for the caller (mirrors `/api/profile/match`) |
| `POST /api/professors/[id]/draft-email` | auth | LLM draft; rate-limited (§9) |
| `GET/POST/PATCH /api/outreach` | auth | Outreach tracker CRUD |
| `POST /api/professors/[id]/report` | auth | "Wrong/stale/left" — crowdsourced verification |
| `POST /api/opt-out` | public | Professor removal request (§10) |
| `POST /api/admin/universities/resolve` | admin | Review-queue accept/reject |
| `POST /api/admin/universities/[id]/ingest` | admin | Kick off / re-sync one university |

Types go in `packages/shared` so web + mobile break at build time on drift.

---

## 8. UI surfaces

**8.1 Web (`apps/web`)**
- `/professors` — search + filters, grouped by university.
- `/professors/[slug]` — profile, topics, works, faculty-page link, draft-email CTA.
- `/universities/[slug]` — professors + **scholarships at this university**.
- `/dashboard` — "Professors matching your research" card + outreach tracker.
- Admin: university review queue, per-university ingest trigger, professor moderation.

**8.2 Mobile (`apps/mobile`)** — deliberately **after** web. Reuse the API; add a
Professors screen under the discover tab. Not in the first web release.

**8.3 SEO (real growth lever)** — `/universities/[slug]/professors` and
`/topics/[slug]` pages target long-tail queries like "machine learning professors at TU
Munich", which currently have weak results. Slugs, CMS and R2 image pipeline already exist.

---

## 9. Outreach — how the email actually works

**We never send mail from BairePorbo infrastructure.** Not in v1, not later.

Three reasons: professors ignore mail that isn't from a personal academic address; bulk
cold-email from one domain gets that domain blacklisted; and if hundreds of students blast
near-identical LLM text at the same professors, those professors start filtering on
origin — poisoning the well for **every** Bangladeshi applicant, including non-users. That
is an existential reputational risk for a platform whose whole brand is helping this
cohort.

Instead:
1. Generate an **editable draft** — must reference a specific paper and the student's own
   work; the student picks the paper.
2. Hand off via **`mailto:`** (with subject/body prefilled) plus copy-to-clipboard, so it
   sends from *their* Gmail.
3. **Guardrails:** require a reasonably complete research profile; cap drafts per week;
   refuse to generate for more than N professors in one session; show etiquette guidance
   (one email, personalised, CV attached, name a specific paper, don't chase).
4. Log to `outreach_log` for the student's own tracking.

**Emails, v1:** don't store them. **Link to the official faculty page**, where the address
is published in context. Revisit only with the governance in §10 in place.

---

## 10. Data governance

Most target countries (Germany, EU broadly) are GDPR jurisdictions and professors are data
subjects with erasure rights. Non-negotiables from day one:

- **Provenance on every record** — `source_url` + `fetched_at`. Already in the schema.
- **Public opt-out page** + `professors.status='opted_out'` that hard-excludes from all
  results and future re-ingestion (an opt-out must survive the next sync).
- Prefer **CC0 sources** (OpenAlex, ORCID) — legally clean to store and redistribute.
- Respect `robots.txt`; identify ourselves in the User-Agent; stay in OpenAlex's polite
  pool.
- No emails in bulk (§9). No rankings scraping (§2).
- Show `last_verified_at` in the UI — honesty about staleness *is* the trust feature.

---

## 11. Phasing

Professor ingestion and scholarship linking are **independent** — do not gate the feature
on backlog cleanup.

### Phase 0 — University foundation *(prerequisite for everything)*
- `026` migration; `seed-universities.ts` from OpenAlex; logos/domains.
- Split funder vs host university in prompts + schema.
- `pg_trgm` matcher + admin review queue; grind the backlog.
- `profiles.university` typeahead.
- **Ships value on its own:** real university filters and grouping on the scholarship
  catalogue.

### Phase 1 — Professor corpus (no matching yet)
- `027` migration; `ingest-professors.ts` for **25–30 pilot universities**, chosen
  **top-down** by destination popularity (JP, DE, KR, CN, TW) × OpenAlex `works_count`
  — *not* bottom-up from our catalogue, which inherits import bias.
- Import the OpenAlex topic taxonomy; populate `professor_topics`.
- Admin QA on a sample before widening.
- Browse-by-topic and university professor lists go live (already useful, already SEO).

### Phase 2 — Matching
- `028` migration; batched `embed-professors.ts`; storage decision from §6.2.
- `GET /api/professors/match` mirroring `/api/profile/match`.
- CV-derived fingerprint + research-profile step (§5.4).
- `/professors` UI with matched-paper display.

### Phase 3 — Outreach
- `029` migration; LLM explanation + draft generation, cached.
- `mailto:` handoff, etiquette guardrails, rate limits.
- Outreach tracker; "report wrong info" endpoint.

### Phase 4 — Close the loop & widen
- Scholarship↔professor surfacing, including `scope='country_wide'` dynamic resolution.
- Dashboard integration; deadline-aware nudges via the existing push cron.
- SEO pages; mobile screen; widen coverage on request; quarterly re-sync GH Action.

---

## 12. Timeline (rough)

| Phase | Estimate | Notes |
|---|---|---|
| 0 — Universities | 3–5 days | Most of it is funder/host modelling + review UI, not data pulling |
| 1 — Professor corpus | 4–6 days | Ingestion runtime is mostly unattended |
| 2 — Matching | ~1 week | Embedding run ≈ 3h batched |
| 3 — Outreach | 4–5 days | |
| 4 — Loop, SEO, mobile | ~1 week | |

**~4–5 weeks total.** Phase 0 alone is worth shipping independently.

---

## 13. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Students spam professors with LLM text; cohort reputation damage** | **Highest** | Never send from our domain; `mailto:` only; per-paper personalisation required; weekly caps; etiquette UX (§9) |
| Thin student profiles → garbage matches → "it's broken" | High | CV-derived fingerprint; abstract paste; topic picker; refuse to rank on too little signal (§5.4) |
| Coverage gap — student's target university absent | High | Be explicit about which universities are covered; "request a university" button feeding the ingest backlog |
| Vector storage / HNSW blows the Neon plan | Medium | Cap works per professor; `halfvec`; cluster embeddings — decide **before** ingest (§6.2) |
| NIM 40 req/min makes embedding unfinishable | Medium | Batch ~32 inputs/request (§6.2) |
| Staleness — professors move, retire, stop taking students | Medium | `last_verified_at` shown in UI; quarterly re-sync; user "report wrong" → crowdsourced verification becomes the moat |
| OpenAlex author disambiguation errors (merges/splits) | Medium | Cross-check ORCID; admin moderation; user reports |
| GDPR / erasure request | Medium | Provenance columns, opt-out page, CC0 sources, no bulk emails (§10) |
| Scholarship backlog matching drags on | Low | Decoupled from Phases 1–3; auto-accept + review queue + learned aliases |
| Feature dilutes focus from the scholarship core | Low | Phase 0 improves the core catalogue regardless; each phase independently shippable |

---

## 14. Open questions

1. **Pilot university list** — confirm the 25–30. Proposal: weight Japan, Germany, South
   Korea, China, Taiwan (supervisor contact mandatory) over US/UK (where cold-emailing is
   often counterproductive).
2. **Backlog size** — how many scholarships need university resolution? Under ~500 means
   the review queue is an afternoon and we can skip a fancier matcher.
3. **Neon plan headroom** — current storage/RAM, and pgvector version (does it support
   `halfvec`?). Determines §6.2.
4. **Emails** — hold at "link to faculty page" for v1, as recommended? Or is storing
   publicly-listed addresses in scope, accepting the §10 obligations?
5. **NIM budget** — stay on the free tier (batched, ~3h) or pay for headroom to widen
   coverage faster?
6. **`accepting_students`** — leave nullable/unknown in v1, or hand-curate for the pilot
   set (high effort, high student value)?
7. **Free vs gated** — is professor matching a logged-in feature, a differentiator for a
   paid tier, or open for SEO reach? Affects §8.3.

---

## 15. Immediate next steps

1. Answer Q1–Q3 in §14 — they gate schema and ingest decisions.
2. Count scholarships by `uni_match_status`-equivalent (how many have a usable
   `thumbnail_prompt` university string) to size the backlog.
3. Write `026_universities.sql` + `seed-universities.ts`; seed and eyeball the data.
4. Fix the enrich/bulk prompts to emit `funder_name` / `host_university_names[]` / `scope`.
5. Build the trigram matcher + admin review queue; clear the backlog.
6. Only then start Phase 1 professor ingestion on **one** pilot university end-to-end
   before scaling to 30.
