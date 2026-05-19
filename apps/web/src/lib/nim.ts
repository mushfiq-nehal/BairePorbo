import Redis from "ioredis";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

type NimFetchResult = {
  response: Response;
  model: string;
};

type NimChatPayload = {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  chat_template_kwargs?: Record<string, unknown>;
};

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_EMBED_URL = process.env.NIM_EMBEDDING_URL ?? "https://integrate.api.nvidia.com/v1/embeddings";
const REDIS_PREFIX = process.env.REDIS_PREFIX ?? "bp";

const rateLimitLua = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

const globalRateLimit = (() => {
  const globalScope = globalThis as typeof globalThis & {
    __bpRateLimit?: Map<string, RateLimitState>;
    __bpRedis?: Redis | null;
  };
  if (!globalScope.__bpRateLimit) {
    globalScope.__bpRateLimit = new Map();
  }
  return globalScope.__bpRateLimit;
})();

const getRedis = (): Redis | null => {
  const redisUrl = process.env.REDIS_URL;
  const globalScope = globalThis as typeof globalThis & {
    __bpRedis?: Redis | null;
  };

  if (!redisUrl) {
    globalScope.__bpRedis = null;
    return null;
  }

  if (!globalScope.__bpRedis) {
    globalScope.__bpRedis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
  }

  return globalScope.__bpRedis;
};

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
};

export const checkRateLimit = async (
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> => {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `${REDIS_PREFIX}:rate:${key}`;
      const result = (await redis.eval(
        rateLimitLua,
        1,
        redisKey,
        config.windowMs.toString()
      )) as [number, number];
      const count = Number(result?.[0] ?? 0);
      const ttl = Number(result?.[1] ?? config.windowMs);
      const allowed = count <= config.limit;
      return {
        allowed,
        remaining: Math.max(0, config.limit - count),
        resetMs: ttl > 0 ? ttl : config.windowMs,
      };
    } catch (error) {
      logRequest("rate_limit.redis_error", { error: String(error) });
    }
  }

  const now = Date.now();
  const existing = globalRateLimit.get(key);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + config.windowMs;
    globalRateLimit.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetMs: config.windowMs };
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetMs: existing.resetAt - now };
  }

  existing.count += 1;
  globalRateLimit.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, config.limit - existing.count),
    resetMs: existing.resetAt - now,
  };
};

export const logRequest = (message: string, meta?: Record<string, string | number | boolean>) => {
  const details = meta ? ` ${JSON.stringify(meta)}` : "";
  console.info(`[nim] ${message}${details}`);
};

const getNimModels = () => {
  const primary = process.env.NIM_MODEL ?? "google/gemma-4-31b-it";
  const fallback = process.env.NIM_FALLBACK_MODEL;
  const models = [primary, fallback].filter((value): value is string => Boolean(value));
  return Array.from(new Set(models));
};

const getEmbeddingModel = () => process.env.NIM_EMBEDDING_MODEL ?? "nvidia/nv-embedqa-e5-v5";

export const fetchNimWithFallback = async (
  payload: Omit<NimChatPayload, "model">,
  options: { apiKey: string; accept: string }
): Promise<NimFetchResult> => {
  const models = getNimModels();
  let lastError: Error | null = null;

  for (const model of models) {
    const requestBody: NimChatPayload = { ...payload, model };
    try {
      const response = await fetch(NIM_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          Accept: options.accept,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`NIM error (${response.status}) for ${model}: ${text}`);
        continue;
      }

      return { response, model };
    } catch (error) {
      lastError = new Error(`NIM network error for ${model}: ${String(error)}`);
    }
  }

  throw lastError ?? new Error("NIM request failed");
};

export const generateEmbedding = async (
  input: string,
  apiKey: string,
  inputType: "query" | "passage" = "passage"
): Promise<number[]> => {
  const request = async (payload: Record<string, unknown>) =>
    fetch(NIM_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

  const basePayload = {
    model: getEmbeddingModel(),
    input,
    input_type: inputType,
  };

  let response = await request(basePayload);
  if (!response.ok) {
    const text = await response.text();
    const needsInputType = text.includes("input_type") && text.includes("required");
    if (needsInputType) {
      response = await request({
        model: getEmbeddingModel(),
        input: [{ text: input, input_type: inputType }],
        input_type: inputType,
      });
    }

    if (!response.ok) {
      const retryText = await response.text();
      throw new Error(`NIM embedding error (${response.status}): ${retryText}`);
    }
  }

  const data = (await response.json()) as {
    data?: { embedding?: number[] }[];
  };

  const embedding = data?.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("NIM embedding response missing embedding array");
  }

  return embedding;
};
