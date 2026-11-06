
export type AIWorkspace =
  | "Chat"
  | "CA"
  | "Coder"
  | "Documents";

export type TaskWorkspace =
  | "Chat"
  | "CA"
  | "Coder";

export type AIProvider = "ollama";

export type AIModelConfig = {
  provider: AIProvider;
  model: string;
  temperature: number;
};
