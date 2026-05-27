/**
 * Postgres-backed prompt cache.
 *
 * Caches assistant responses keyed by:
 *   sha256(system_prompt_version + model + normalized_user_msg)
 *
 * Notes on what is INTENTIONALLY excluded from the key:
 *  - RAG context: embeddings from shared inference endpoints are not perfectly
 *    deterministic, and similarity-ordered match results can flip order on
 *    ties. Either produces a different concatenated context across otherwise
 *    identical calls, which would make cache hits effectively impossible.
 *    Corpus drift is handled by the 24h TTL and `SYSTEM_PROMPT_VERSION`
 *    (bump it if the corpus or prompt shape changes meaningfully).
 *  - Conversation history: the route only invokes the cache when there is
 *    exactly one user-role turn, so by definition the question is fresh.
 */

import { createHash } from "crypto";
import { createServiceClient } from "@/utils/supabase/server";

const CACHE_TTL_HOURS = Number(process.env.PROMPT_CACHE_TTL_HOURS ?? 24);
const CACHE_DISABLED = process.env.PROMPT_CACHE_DISABLED === "1";

// Bump this any time the system prompt or shape changes so old entries
// invalidate naturally instead of needing a manual flush.
export const SYSTEM_PROMPT_VERSION = "v1";

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

export type CacheKeyInput = {
  model: string;
  userMessage: string;
};

export const buildCacheKey = ({ model, userMessage }: CacheKeyInput): string => {
  const payload = [
    SYSTEM_PROMPT_VERSION,
    model,
    normalize(userMessage),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
};

export type CacheLookup = {
  cacheKey: string;
  hit: boolean;
  response?: string;
};

export const lookupPromptCache = async (
  input: CacheKeyInput,
): Promise<CacheLookup> => {
  const cacheKey = buildCacheKey(input);

  if (CACHE_DISABLED) {
    return { cacheKey, hit: false };
  }

  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("prompt_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      // Most common cause: migration 012 hasn't been applied (table missing).
      console.warn("[prompt-cache] lookup error:", error.message);
      return { cacheKey, hit: false };
    }

    if (!data?.response) {
      console.info("[prompt-cache] miss", { cacheKey: cacheKey.slice(0, 12) });
      return { cacheKey, hit: false };
    }

    console.info("[prompt-cache] hit", { cacheKey: cacheKey.slice(0, 12) });
    // Fire-and-forget hit counter bump.
    db.rpc("bump_prompt_cache_hit", { p_cache_key: cacheKey }).then(() => {});

    return { cacheKey, hit: true, response: data.response };
  } catch (err) {
    console.warn("[prompt-cache] lookup threw:", err);
    return { cacheKey, hit: false };
  }
};

export const writePromptCache = async (
  cacheKey: string,
  model: string,
  userMessage: string,
  response: string,
): Promise<void> => {
  if (CACHE_DISABLED) return;
  if (!response.trim()) return;

  try {
    const db = createServiceClient();
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60_000).toISOString();
    const { error } = await db.from("prompt_cache").upsert(
      {
        cache_key: cacheKey,
        model,
        user_message: userMessage.slice(0, 4000),
        response,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
    if (error) {
      console.warn("[prompt-cache] write error:", error.message);
    } else {
      console.info("[prompt-cache] write ok", { cacheKey: cacheKey.slice(0, 12) });
    }
  } catch (err) {
    // Caching is best-effort — never let it block the request path.
    console.warn("[prompt-cache] write threw:", err);
  }
};
