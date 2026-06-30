/**
 * AI model choices and their display labels.
 * This file is intentionally free of server-side imports so it can be
 * safely used by both server code (api routes) and client components.
 */

export type ModelChoice = "nim" | "kimi" | "deepseek" | "mistral" | "deepseek-pro" | "minimax-m3";

export const MODEL_OPTIONS: { value: ModelChoice; label: string }[] = [
  { value: "deepseek", label: "Deepseek V4 (best quality)" },
  { value: "mistral", label: "Mistral AI (fast, cheap)" },
  { value: "nim", label: "NVIDIA NIM (env model)" },
  { value: "kimi", label: "Kimi K2.6 (Moonshot / NIM)" },
  { value: "deepseek-pro", label: "Deepseek V4 Pro + Web Search (experimental)" },
  { value: "minimax-m3", label: "MiniMax M3 + Web Search (experimental)" },
];

/** Models that support OpenRouter's web-search grounding plugin. */
export const WEB_SEARCH_MODELS: ModelChoice[] = ["deepseek-pro", "minimax-m3"];
