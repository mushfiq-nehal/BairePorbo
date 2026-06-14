/**
 * Unified non-streaming chat completion across providers, used by admin
 * tools (parse / enrich). The user-facing chat uses the streaming helpers
 * in openrouter.ts; this is for one-shot JSON extraction tasks.
 *
 * Supported model choices:
 *   "nim"       → NVIDIA NIM (NIM_MODEL env, e.g. kimi/gemma)
 *   "deepseek"  → OpenRouter deepseek/deepseek-v4-flash
 *   "mistral"   → OpenRouter mistralai/ministral-3b-2512
 */

import { logRequest } from "@/lib/nim";

export type ModelChoice = "nim" | "deepseek" | "mistral" | "minimax" | "qwen";

export const MODEL_OPTIONS: { value: ModelChoice; label: string }[] = [
  { value: "deepseek", label: "Deepseek V4 Flash (OpenRouter)" },
  { value: "mistral", label: "Mistral AI (OpenRouter)" },
  { value: "nim", label: "NVIDIA NIM" },
  { value: "minimax", label: "MiniMax M3 (OpenRouter)" },
  { value: "qwen", label: "Qwen3 235B (OpenRouter)" },
];

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type Message = { role: string; content: string };

type CompletionOpts = {
  model: ModelChoice;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

type CompletionResult = {
  content: string;
  modelUsed: string;
};

const OPENROUTER_MODEL_MAP: Record<string, string> = {
  deepseek: "deepseek/deepseek-v4-flash",
  mistral:  "mistralai/ministral-3b-2512",
  minimax:  "minimax/minimax-m3",
  qwen:     "qwen/qwen3-235b-a22b-2507",
};

const resolveOpenRouterModel = (choice: ModelChoice): string => {
  if (choice in OPENROUTER_MODEL_MAP) return OPENROUTER_MODEL_MAP[choice];
  return process.env.OPENROUTER_FALLBACK_MODEL ?? "mistralai/ministral-3b-2512";
};

const callOpenRouter = async (
  messages: Message[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error (${res.status}) for ${model}: ${text}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data?.choices?.[0]?.message?.content ?? "";
};

const callNim = async (
  messages: Message[],
  maxTokens: number,
  temperature: number,
): Promise<{ content: string; model: string }> => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not configured.");

  const models = [
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
  const { model, system, user, maxTokens = 1024, temperature = 0.2 } = opts;
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  if (model === "nim") {
    const { content, model: modelUsed } = await callNim(messages, maxTokens, temperature);
    logRequest("ai.completion", { provider: "nim", model: modelUsed });
    return { content, modelUsed };
  }

  const orModel = resolveOpenRouterModel(model);
  const content = await callOpenRouter(messages, orModel, maxTokens, temperature);
  logRequest("ai.completion", { provider: "openrouter", model: orModel });
  return { content, modelUsed: orModel };
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
