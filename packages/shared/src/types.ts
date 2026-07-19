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

// ── Dashboard (auth) ─────────────────────────────────────────────────────────

/** Scholarship projection returned inside the dashboard payload. */
export interface BookmarkScholarship {
  id: string;
  title: string;
  country: string | null;
  funding_type: string | null;
  deadline: string | null;
  thumbnail_url: string | null;
  competitiveness: string | null;
  degree_level: string | null;
}

/** Response from `GET /api/dashboard` — profile readiness, bookmarks, last chat. */
export interface DashboardResponse {
  user: { name: string; email: string | null };
  stats: {
    readiness: number;
    bookmarksCount: number;
    missingFields: string[];
    newScholarshipsCount: number;
  };
  bookmarks: BookmarkScholarship[];
  bookmarksClosingSoon: BookmarkScholarship[];
  lastSession: { id: string; title: string; updated_at: string; preview: string | null } | null;
}

// ── Bookmarks (auth) ─────────────────────────────────────────────────────────

export interface BookmarksResponse {
  bookmarks: { scholarship_id: string }[];
}

// ── Guides (public) ──────────────────────────────────────────────────────────

export interface GuideFaq {
  question: string;
  answer: string;
}

/** Row returned by `GET /api/guides` (published guides). */
export interface Guide {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  intro: string | null;
  content: string | null;
  faqs: GuideFaq[] | null;
  published_at: string | null;
  updated_at: string | null;
  cover_image_url: string | null;
  is_pinned: boolean;
}

export interface GuidesResponse {
  guides: Guide[];
}

// ── CV Builder (auth) ────────────────────────────────────────────────────────

export type CVTemplateId = "classic" | "modern" | "europass" | "photo";

export interface ContactLink { label: string; url: string }
export interface EducationEntry {
  institution: string; degree: string; field: string; location: string;
  startDate: string; endDate: string; gpa: string; details: string;
}
export interface ExperienceEntry {
  role: string; organization: string; location: string;
  startDate: string; endDate: string; description: string;
}
export interface AwardEntry { title: string; issuer: string; year: string; description: string }
export interface SkillGroup { category: string; items: string }
export interface ReferenceEntry { name: string; affiliation: string; relation: string; email: string }
export interface PublicationEntry { title: string; venue: string; date: string; doi: string }
export interface ProjectEntry {
  title: string; organization: string; link: string;
  startDate: string; endDate: string; description: string;
}
export interface TextEntry { text: string }

export type SectionKey =
  | "researchInterests" | "summary" | "education" | "researchExperience"
  | "publications" | "teachingExperience" | "workExperience" | "projects"
  | "presentations" | "awards" | "skills" | "languages" | "references";

/** Full CV document (stored as JSONB in `user_cvs.data`). */
export interface CVData {
  fullName: string; headline: string; photo: string; showPhoto: boolean;
  email: string; phone: string; location: string; website: string;
  githubUrl: string; googleScholarUrl: string; orcid: string; kaggleUrl: string;
  links: ContactLink[];
  researchInterests: string; summary: string;
  education: EducationEntry[];
  researchExperience: ExperienceEntry[];
  workExperience: ExperienceEntry[];
  teachingExperience: ExperienceEntry[];
  projects: ProjectEntry[];
  publications: PublicationEntry[];
  presentations: TextEntry[];
  awards: AwardEntry[];
  skills: SkillGroup[];
  languages: TextEntry[];
  references: ReferenceEntry[];
  sectionOrder: SectionKey[];
}

export interface CVRecord {
  id: string;
  title: string;
  template: CVTemplateId;
  data: CVData;
  created_at: string;
  updated_at: string;
}

export interface CvsResponse { cvs: CVRecord[] }
export interface CvResponse { cv: CVRecord }

/** Structured feedback from `POST /api/cv/analyze`. */
export interface SectionFeedback {
  name: string;
  rating: "strong" | "adequate" | "needs-work" | "missing";
  feedback: string;
  suggestions: string[];
}
export interface CVAnalysis {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  sections: SectionFeedback[];
  missingSections: string[];
  actionItems: string[];
}
export interface CvAnalyzeResponse {
  analysis: CVAnalysis;
  sourceName: string | null;
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
