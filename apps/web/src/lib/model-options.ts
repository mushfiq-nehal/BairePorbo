/**
 * AI model choices and their display labels.
 * This file is intentionally free of server-side imports so it can be
 * safely used by both server code (api routes) and client components.
 */

export type ModelChoice = "nim" | "kimi" | "deepseek" | "mistral";

export const MODEL_OPTIONS: { value: ModelChoice; label: string }[] = [
  { value: "deepseek", label: "Deepseek V4 (best quality)" },
  { value: "mistral", label: "Mistral AI (fast, cheap)" },
  { value: "nim", label: "NVIDIA NIM (env model)" },
  { value: "kimi", label: "Kimi K2.6 (Moonshot / NIM)" },
];
