import type {
  AIModelConfig,
  AIWorkspace,
} from "./types";

const DEFAULT_MODEL = "qwen2.5:7b";

export const MODEL_CONFIG: Record<
  AIWorkspace,
  AIModelConfig
> = {
  Chat: {
    provider: "ollama",
    model: DEFAULT_MODEL,
    temperature: 0.4,
  },

  CA: {
    provider: "ollama",
    model: DEFAULT_MODEL,
    temperature: 0.3,
  },

  Coder: {
  provider: "ollama",
  model: "qwen2.5-coder:7b",
  temperature: 0.2,
},

  Documents: {
    provider: "ollama",
    model: DEFAULT_MODEL,
    temperature: 0.3,
  },
};

export function getModelConfig(
  workspace: AIWorkspace
): AIModelConfig {
  return MODEL_CONFIG[workspace];
}