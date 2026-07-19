/**
 * Framework-agnostic API client for the BairePorbo Next.js backend.
 *
 * Centralizes: the API base URL, Clerk Bearer-token injection, the `x-anon-key`
 * header for anonymous chat, and error parsing. Consumed by apps/mobile (and,
 * later, apps/web). No React, no Expo, no Node built-ins — just `fetch`.
 */

import type {
  BookmarksResponse,
  ChatRequestBody,
  ChatSessionMessagesResponse,
  ChatSessionsResponse,
  CVData,
  CVTemplateId,
  CvAnalyzeResponse,
  CvResponse,
  CvsResponse,
  DashboardResponse,
  GuidesResponse,
  MetaResponse,
  ProfileResponse,
  ProfileUpdate,
  ScholarshipDetailResponse,
  ScholarshipDocumentsResponse,
  ScholarshipsResponse,
} from "./types";

/** Error thrown for any non-2xx response, carrying the parsed JSON body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown> | null;

  constructor(status: number, body: Record<string, unknown> | null, message?: string) {
    super(message ?? (typeof body?.error === "string" ? body.error : `Request failed (${status})`));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** True when the backend signals that the anonymous trial cap was hit. */
  get signinRequired(): boolean {
    return this.body?.signinRequired === true;
  }
}

export interface ApiClientConfig {
  /** e.g. https://baireporbo.app */
  baseUrl: string;
  /** Returns a fresh Clerk session token, or null when signed out. */
  getToken: () => Promise<string | null>;
  /** Stable per-install key for anonymous chat rate limiting (optional). */
  getAnonKey?: () => string | null | Promise<string | null>;
  /** Injectable fetch (RN passes `expo/fetch` for streaming). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken, getAnonKey } = config;
  const doFetch = config.fetchImpl ?? fetch;

  async function resolveAnonKey(): Promise<string | null> {
    if (!getAnonKey) return null;
    return (await getAnonKey()) ?? null;
  }

  async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...extra };
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      // Anonymous callers identify themselves to the session/chat endpoints via
      // the x-anon-key header. Harmless on endpoints that ignore it.
      const anonKey = await resolveAnonKey();
      if (anonKey) headers["x-anon-key"] = anonKey;
    }
    return headers;
  }

  async function request<T>(
    path: string,
    init: RequestInit = {},
    opts: { skipAuth?: boolean } = {},
  ): Promise<T> {
    // Some public endpoints (e.g. /api/guides) reject requests that carry an
    // Authorization header (403). Pass `skipAuth` to fetch them anonymously,
    // exactly as the web does for public content.
    const headers = opts.skipAuth
      ? ((init.headers as Record<string, string> | undefined) ?? {})
      : await authHeaders(init.headers as Record<string, string> | undefined);
    const res = await doFetch(`${baseUrl}${path}`, { ...init, headers });

    if (!res.ok) {
      let body: Record<string, unknown> | null = null;
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function jsonRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  return {
    ApiError,

    // ── Scholarships (public) ──
    getScholarships(status = "published") {
      return request<ScholarshipsResponse>(`/api/scholarships?status=${encodeURIComponent(status)}`);
    },
    getScholarship(id: string) {
      return request<ScholarshipDetailResponse>(`/api/scholarships/${encodeURIComponent(id)}`);
    },
    /** POST-driven: generates (once) then returns the cached document checklist. */
    getScholarshipDocuments(id: string) {
      return jsonRequest<ScholarshipDocumentsResponse>(
        `/api/scholarships/${encodeURIComponent(id)}/documents`,
        "POST",
        {},
      );
    },

    // ── Guides (public) — must be fetched anonymously; the endpoint 403s on auth. ──
    getGuides() {
      return request<GuidesResponse>(`/api/guides`, {}, { skipAuth: true });
    },

    // ── Meta (public) ──
    getMeta() {
      return request<MetaResponse>(`/api/meta`);
    },

    // ── Dashboard (auth) — profile readiness, bookmarks, last chat ──
    getDashboard() {
      return request<DashboardResponse>(`/api/dashboard`);
    },

    // ── CV Builder (auth) ──
    getCvs() {
      return request<CvsResponse>(`/api/cv`);
    },
    getCv(id: string) {
      return request<CvResponse>(`/api/cv/${encodeURIComponent(id)}`);
    },
    createCv(body: { title?: string; template?: CVTemplateId; data?: Partial<CVData> } = {}) {
      return jsonRequest<CvResponse>(`/api/cv`, "POST", body);
    },
    updateCv(id: string, body: { title: string; template: CVTemplateId; data: CVData }) {
      return jsonRequest<CvResponse>(`/api/cv/${encodeURIComponent(id)}`, "PUT", body);
    },
    deleteCv(id: string) {
      return request<{ ok: boolean }>(`/api/cv/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    /** Analyse pasted CV text. */
    analyzeCvText(text: string) {
      return jsonRequest<CvAnalyzeResponse>(`/api/cv/analyze`, "POST", { text });
    },
    /** Analyse an uploaded file. Pass a FormData with a `file` field (RN: {uri,name,type}). */
    async analyzeCvFile(form: FormData) {
      // No Content-Type: fetch sets the multipart boundary itself.
      const headers = await authHeaders();
      const res = await doFetch(`${baseUrl}/api/cv/analyze`, { method: "POST", headers, body: form });
      if (!res.ok) {
        let body: Record<string, unknown> | null = null;
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          /* non-JSON error */
        }
        throw new ApiError(res.status, body);
      }
      return (await res.json()) as CvAnalyzeResponse;
    },

    // ── Bookmarks (auth) ──
    getBookmarks() {
      return request<BookmarksResponse>(`/api/bookmarks`);
    },
    addBookmark(scholarshipId: string) {
      return jsonRequest<{ success: boolean; already?: boolean }>(`/api/bookmarks`, "POST", {
        scholarship_id: scholarshipId,
      });
    },
    removeBookmark(scholarshipId: string) {
      return request<{ success: boolean }>(`/api/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarship_id: scholarshipId }),
      });
    },

    // ── Profile (auth) — the Bearer-token canary (§3.4) ──
    getProfile() {
      return request<ProfileResponse>(`/api/profile`);
    },
    updateProfile(update: ProfileUpdate) {
      return jsonRequest<ProfileResponse>(`/api/profile`, "PUT", update);
    },

    // ── Chat sessions (auth or anon) ──
    getChatSessions() {
      return request<ChatSessionsResponse>(`/api/chat/sessions`);
    },
    async createChatSession(title?: string) {
      // Anon callers must pass anonKey in the body; ignored server-side when signed in.
      const anonKey = await resolveAnonKey();
      return jsonRequest<{ session: ChatSessionsResponse["sessions"][number] }>(
        `/api/chat/sessions`,
        "POST",
        { anonKey, title },
      );
    },
    getChatMessages(sessionId: string) {
      return request<ChatSessionMessagesResponse>(
        `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      );
    },
    deleteChatSession(sessionId: string) {
      return request<void>(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
    },

    /**
     * Stream a chat completion from `POST /api/chat`.
     *
     * Reads the SSE body, splits on newlines, and forwards each parsed
     * `data: {...}` frame — `{ model }` first, then `{ token }` deltas, ending
     * on `[DONE]`. RN callers MUST pass `expo/fetch` as `fetchImpl` (the default
     * RN fetch cannot read a streaming body). Throws `ApiError` on a non-200.
     */
    async streamChat(
      body: ChatRequestBody,
      opts: {
        onModel?: (model: string) => void;
        onToken: (token: string) => void;
        signal?: AbortSignal;
      },
    ): Promise<void> {
      const headers = await authHeaders({ "Content-Type": "application/json" });

      const res = await doFetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: opts.signal,
      });

      if (!res.ok) {
        let errBody: Record<string, unknown> | null = null;
        try {
          errBody = (await res.json()) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, errBody);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming not supported by this fetch implementation.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") return;

          try {
            const frame = JSON.parse(payload) as { model?: string; token?: string; error?: string };
            if (frame.error) throw new ApiError(res.status, { error: frame.error });
            if (typeof frame.model === "string") opts.onModel?.(frame.model);
            if (typeof frame.token === "string") opts.onToken(frame.token);
          } catch (err) {
            if (err instanceof ApiError) throw err;
            /* skip unparseable frame */
          }
        }
      }
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
