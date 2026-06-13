import { createHash } from "crypto";
import { sql } from "@/utils/db";

const CACHE_TTL_HOURS = Number(process.env.PROMPT_CACHE_TTL_HOURS ?? 24);
const CACHE_DISABLED = process.env.PROMPT_CACHE_DISABLED === "1";

export const SYSTEM_PROMPT_VERSION = "v2";

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

export type CacheKeyInput = {
  model: string;
  userMessage: string;
  systemContext?: string;
};

export const buildCacheKey = ({ model, userMessage, systemContext }: CacheKeyInput): string => {
  const payload = [
    SYSTEM_PROMPT_VERSION,
    model,
    normalize(userMessage),
    systemContext ? createHash("sha256").update(systemContext.trim()).digest("hex").slice(0, 16) : "",
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
};

export type CacheLookup = {
  cacheKey: string;
  hit: boolean;
  response?: string;
};

export const lookupPromptCache = async (input: CacheKeyInput): Promise<CacheLookup> => {
  const cacheKey = buildCacheKey(input);

  if (CACHE_DISABLED) return { cacheKey, hit: false };

  try {
    const rows = await sql`
      SELECT response, expires_at FROM prompt_cache
      WHERE cache_key = ${cacheKey} AND expires_at > NOW()
      LIMIT 1
    `;

    if (!rows[0]?.response) {
      console.info("[prompt-cache] miss", { cacheKey: cacheKey.slice(0, 12) });
      return { cacheKey, hit: false };
    }

    console.info("[prompt-cache] hit", { cacheKey: cacheKey.slice(0, 12) });
    sql`SELECT bump_prompt_cache_hit(${cacheKey})`.catch(() => {});

    return { cacheKey, hit: true, response: rows[0].response as string };
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
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60_000).toISOString();
    await sql`
      INSERT INTO prompt_cache (cache_key, model, user_message, response, expires_at)
      VALUES (${cacheKey}, ${model}, ${userMessage.slice(0, 4000)}, ${response}, ${expiresAt})
      ON CONFLICT (cache_key) DO UPDATE SET
        response    = EXCLUDED.response,
        expires_at  = EXCLUDED.expires_at,
        model       = EXCLUDED.model,
        user_message = EXCLUDED.user_message
    `;
    console.info("[prompt-cache] write ok", { cacheKey: cacheKey.slice(0, 12) });
  } catch (err) {
    console.warn("[prompt-cache] write threw:", err);
  }
};
