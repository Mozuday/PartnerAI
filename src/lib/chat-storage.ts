
import type { SavedChat } from "./types";

const STORAGE_KEY = "PartnerAI-chat-history";
const ACTIVE_CHAT_KEY = "PartnerAI-active-chat";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Load all saved conversations.
export function loadChats(): SavedChat[] {
  const storage = getStorage();

  if (!storage) return [];

  try {
    const saved = storage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    return Array.isArray(parsed) ? (parsed as SavedChat[]) : [];
  } catch (error) {
    console.error("Could not load chat history:", error);
    return [];
  }
}

// Get the previously selected conversation ID.
export function loadActiveChatId(): string | null {
  const storage = getStorage();

  if (!storage) return null;

  try {
    return storage.getItem(ACTIVE_CHAT_KEY);
  } catch (error) {
    console.error("Could not load active chat:", error);
    return null;
  }
}

// Save conversations and the active conversation ID.
export function saveChats(
  chats: SavedChat[],
  activeChatId: string | null
): void {
  const storage = getStorage();

  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(chats));

    if (activeChatId) {
      storage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    } else {
      storage.removeItem(ACTIVE_CHAT_KEY);
    }
  } catch (error) {
    console.error("Could not save chat history:", error);
    throw error;
  }
}

// Remove the saved active conversation ID.
export function clearActiveChatId(): void {
  const storage = getStorage();

  if (!storage) return;

  try {
    storage.removeItem(ACTIVE_CHAT_KEY);
  } catch (error) {
    console.error("Could not clear active chat:", error);
  }
}