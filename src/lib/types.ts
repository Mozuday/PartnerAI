export type ChatRole = "user" | "assistant";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: "Web" | "Website";
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  sources?: SearchResult[];
};

export type SavedChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  documentName?: string;
  documentText?: string;
};

export type DocumentChunk = {
  text: string;
  page: number | null;
};

export type WorkspaceName =
  | "Chat"
  | "Documents"
  | "Coding"
  | "Business & CA";