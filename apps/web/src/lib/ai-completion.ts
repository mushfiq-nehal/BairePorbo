/**
 * Unified non-streaming chat completion across providers, used by admin
 * tools (parse / enrich). The user-facing chat uses the streaming helpers
 * in openrouter.ts; this is for one-shot JSON extraction tasks.
 *
 * Supported model choices:
 *   "nim"          → NVIDIA NIM (NIM_MODEL env, e.g. kimi/gemma)
 *   "kimi"         → NVIDIA NIM, explicitly moonshotai/kimi-k2.6
 *   "deepseek"     → OpenRouter deepseek/deepseek-v4-flash
 *   "mistral"      → OpenRouter mistralai/ministral-3b-2512
 *   "deepseek-pro" → OpenRouter deepseek/deepseek-v4-pro (+ web search plugin)
 *   "minimax-m3"   → OpenRouter minimax/minimax-m3 (+ web search plugin)
 */

import { logRequest } from "@/lib/nim";
import type { ModelChoice } from "@/lib/model-options";
import { WEB_SEARCH_MODELS } from "@/lib/model-options";

export type { ModelChoice } from "@/lib/model-options";
export { MODEL_OPTIONS } from "@/lib/model-options";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type Message = { role: string; content: string };

type CompletionOpts = {
  model: ModelChoice;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Enable OpenRouter's web-search grounding plugin (Exa-powered). Only
   * meaningful for models in WEB_SEARCH_MODELS; ignored otherwise. */
  webSearch?: boolean;
  webSearchMaxResults?: number;
  /** Abort the upstream request if it hasn't responded within this many ms.
   * Unset = no client-side timeout (rely on the platform's own limits). */
  timeoutMs?: number;
};

type CompletionResult = {
  content: string;
  modelUsed: string;
  /** Web search source citations, present when webSearch was used and the
   * model actually grounded its answer in search results. */
  citations?: { url: string; title?: string }[];
};

const resolveOpenRouterModel = (choice: ModelChoice): string => {
  if (choice === "deepseek") {
    return process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash";
  }
  if (choice === "deepseek-pro") return "deepseek/deepseek-v4-pro";
  if (choice === "minimax-m3") return "minimax/minimax-m3";
  return process.env.OPENROUTER_FALLBACK_MODEL ?? "mistralai/ministral-3b-2512";
};

const callOpenRouter = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  temperature: number,
  webSearch?: { maxResults: number },
  timeoutMs?: number,
): Promise<{ content: string; citations?: { url: string; title?: string }[] }> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  };
  if (webSearch) {
    body.plugins = [{ id: "web", max_results: webSearch.maxResults }];
  }

  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenRouter request to ${model} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error (${res.status}) for ${model}: ${text}`);
  }

  type Annotation = { type: string; url_citation?: { url: string; title?: string } };
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; annotations?: Annotation[] } }[];
  };
  const message = data?.choices?.[0]?.message;
  const citations = message?.annotations
    ?.filter((a) => a.type === "url_citation" && a.url_citation)
    .map((a) => ({ url: a.url_citation!.url, title: a.url_citation!.title }));
  return { content: message?.content ?? "", citations: citations?.length ? citations : undefined };
};

const callNim = async (
  messages: Message[],
  maxTokens: number,
  temperature: number,
  explicitModel?: string,
): Promise<{ content: string; model: string }> => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not configured.");

  const models = explicitModel
    ? [explicitModel]
    : [
        process.env.NIM_MODEL ?? "moonshotai/kimi-k2.6",
        process.env.NIM_FALLBACK_MODEL,
      ].filter((m): m is string => Boolean(m));

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const res = await fetch(NIM_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
      });
      if (!res.ok) {
        lastError = new Error(`NIM error (${res.status}) for ${model}: ${await res.text()}`);
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return { content: data?.choices?.[0]?.message?.content ?? "", model };
    } catch (err) {
      lastError = new Error(`NIM network error for ${model}: ${String(err)}`);
    }
  }
  throw lastError ?? new Error("NIM request failed");
};

export const fetchCompletion = async (opts: CompletionOpts): Promise<CompletionResult> => {
  const { model, system, user, maxTokens = 1024, temperature = 0.2, webSearch, webSearchMaxResults = 5, timeoutMs } = opts;
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  if (model === "nim") {
    const { content, model: modelUsed } = await callNim(messages, maxTokens, temperature);
    logRequest("ai.completion", { provider: "nim", model: modelUsed });
    return { content, modelUsed };
  }

  if (model === "kimi") {
    const { content, model: modelUsed } = await callNim(messages, maxTokens, temperature, "moonshotai/kimi-k2.6");
    logRequest("ai.completion", { provider: "nim", model: modelUsed });
    return { content, modelUsed };
  }

  const orModel = resolveOpenRouterModel(model);
  const useWebSearch = Boolean(webSearch) && WEB_SEARCH_MODELS.includes(model);
  const { content, citations } = await callOpenRouter(
    messages,
    orModel,
    maxTokens,
    temperature,
    useWebSearch ? { maxResults: webSearchMaxResults } : undefined,
    timeoutMs,
  );
  logRequest("ai.completion", { provider: "openrouter", model: orModel, webSearch: useWebSearch });
  return { content, modelUsed: orModel, citations };
};

/** Strip markdown code fences and parse JSON from a model response. */
export const parseJsonFromCompletion = <T = Record<string, unknown>>(raw: string): T => {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
};

/**
 * Lenient fallback for parseJsonFromCompletion: extracts the outermost
 * `{...}` block from a response that may have stray prose/preamble around
 * it (web-search-grounded models sometimes add a sentence before/after the
 * JSON despite instructions not to). Throws if no balanced object is found
 * or it still doesn't parse — most commonly because the response was
 * truncated mid-object by the token budget, which callers should treat as
 * a signal to retry with a larger maxTokens.
 */
export const extractJsonObject = <T = Record<string, unknown>>(raw: string): T => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
};
