/**
 * Backend response/request shapes for the BairePorbo Next.js API
 * (apps/web/src/app/api/*). Kept in sync manually against the route handlers;
 * imported by both apps/web and apps/mobile so a shape change surfaces at
 * compile time on both clients.
 */

// ── Scholarships ────────────────────────────────────────────────────────────

/** Row shape returned by `GET /api/scholarships` (list projection). */
export interface ScholarshipListItem {
  id: string;
  title: string;
  country: string | null;
  funding_type: string | null;
  deadline: string | null;
  degree_level: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  competitiveness: string | null;
  is_flagship: boolean;
  updated_at: string;
  slug: string | null;
  is_live: boolean | null;
  opening_note: string | null;
}

export interface ScholarshipsResponse {
  scholarships: ScholarshipListItem[];
}

/** Full detail returned by `GET /api/scholarships/[id]` (SELECT *). */
export interface ScholarshipDetail extends ScholarshipListItem {
  official_url: string | null;
  raw_description: string | null;
  ai_summary: string | null;
  eligibility_summary: string | null;
  competitiveness: string | null;
  tips: string | null;
  required_documents: RequiredDocuments | null;
  [key: string]: unknown;
}

export interface ScholarshipDetailResponse {
  scholarship: ScholarshipDetail;
}

/** AI-generated (server-cached) document checklist for one scholarship. */
export interface RequiredDocuments {
  core: string[];
  additional: string[];
  note: string;
}

export interface ScholarshipDocumentsResponse {
  documents: RequiredDocuments;
  cached?: boolean;
}

// ── Profile ─────────────────────────────────────────────────────────────────

/** Row shape from the `profiles` table (`GET /api/profile`). `id` === Clerk userId. */
export interface Profile {
  id: string;
  role: string | null;
  full_name: string | null;
  cgpa: number | null;
  work_experience: string | null;
  target_degree: string | null;
  preferred_countries: string | null;
  goals_notes: string | null;
  bsc_major: string | null;
  university: string | null;
  graduation_year: number | null;
  research_interests: string | null;
  published_papers: string | null;
  ielts_score: string | null;
  gre_gmat_score: string | null;
  internships: string | null;
  portfolio_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileResponse {
  profile: Profile;
}

/** Fields accepted by `PUT /api/profile`. All optional. */
export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "full_name"
    | "cgpa"
    | "work_experience"
    | "target_degree"
    | "preferred_countries"
    | "goals_notes"
    | "bsc_major"
    | "university"
    | "graduation_year"
    | "research_interests"
    | "published_papers"
    | "ielts_score"
    | "gre_gmat_score"
    | "internships"
    | "portfolio_url"
  >
>;

// ── Chat ────────────────────────────────────────────────────────────────────

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Request body for `POST /api/chat`. `anonKey` travels as the `x-anon-key` header. */
export interface ChatRequestBody {
  messages: ChatMessage[];
  sessionId?: string | null;
  /** The single new user turn, persisted server-side when a session is attached. */
  userMessage?: string;
}

/** SSE frames emitted by `POST /api/chat` (`data: {...}\n\n`). */
export type ChatStreamFrame =
  | { model: string }
  | { token: string }
  | { error: string };

/** Projection returned by the chat-session endpoints (no user_id/anon_key). */
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

export interface ChatSessionMessagesResponse {
  messages: (ChatMessage & { id: string; created_at: string })[];
}

// ── Meta ────────────────────────────────────────────────────────────────────

export interface MetaResponse {
  chatModelLabel: string;
  chatModelFallbackLabel: string | null;
}

// ── Errors ──────────────────────────────────────────────────────────────────

export type RateLimitScope = "hourly" | "daily" | "global";

/** Non-200 body returned by rate-limited chat requests. */
export interface RateLimitErrorBody {
  error: string;
  scope: RateLimitScope;
  resetMs: number;
  resetIn: string;
  signinRequired?: boolean;
  remaining: { hourly: number; daily: number; global: number };
}

/** Generic `{ error }` body used by most route handlers on failure. */
export interface ApiErrorBody {
  error: string;
  [key: string]: unknown;
}
