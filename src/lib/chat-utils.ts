
export function createChatId(): string {
  return crypto.randomUUID();
}

export function makeTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");

  return cleaned.length > 38
    ? cleaned.slice(0, 38) + "..."
    : cleaned || "New chat";
}