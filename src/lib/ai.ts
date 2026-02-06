import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

export const models = {
  audit: anthropic("claude-haiku-4-5-20251001"),
  generation: anthropic("claude-opus-4-6"),
  blog: anthropic("claude-sonnet-4-5-20250929"),
  changeInterpretation: anthropic("claude-sonnet-4-5-20250929"),
} as const;

export const fallbackModels = {
  audit: openai("gpt-4o-mini"),
  generation: openai("gpt-4o"),
  blog: openai("gpt-4o-mini"),
  changeInterpretation: openai("gpt-4o-mini"),
} as const;

export type ModelTask = keyof typeof models;
