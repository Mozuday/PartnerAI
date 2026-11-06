
"use client";

import { useCallback, useEffect, useState } from "react";

import type { ChatMessage, SavedChat } from "@/lib/types";

import {
  loadChats,
  loadActiveChatId,
  saveChats,
} from "@/lib/chat-storage";

import { createChatId, makeTitle } from "@/lib/chat-utils";

type ChatHistoryState = {
  chats: SavedChat[];
  activeChatId: string | null;
  messages: ChatMessage[];
  documentName: string;
  documentText: string;
};

function getEmptyHistory(): ChatHistoryState {
  return {
    chats: [],
    activeChatId: null,
    messages: [],
    documentName: "",
    documentText: "",
  };
}

export function useChatHistory() {
  const [history, setHistory] = useState<ChatHistoryState>(
    getEmptyHistory
  );
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const { chats, activeChatId, messages, documentName, documentText } =
    history;

  // Restore history after hydration without synchronously setting state
  // inside the effect body.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedChats = loadChats();
      const savedActiveId = loadActiveChatId();
      const activeChat = savedChats.find(
        (chat) => chat.id === savedActiveId
      );

      setHistory({
        chats: savedChats,
        activeChatId: activeChat?.id ?? null,
        messages: activeChat?.messages ?? [],
        documentName: activeChat?.documentName ?? "",
        documentText: activeChat?.documentText ?? "",
      });
      setHistoryLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Persist only after restoring browser storage.
  useEffect(() => {
    if (!historyLoaded) return;

    try {
      saveChats(chats, activeChatId);
    } catch (error) {
      console.error("Could not save chat history:", error);
    }
  }, [chats, activeChatId, historyLoaded]);

  const saveConversation = useCallback(
    (
      id: string,
      updatedMessages: ChatMessage[],
      docName = documentName,
      docText = documentText
    ) => {
      setHistory((previous) => {
        const existing = previous.chats.find((chat) => chat.id === id);
        const firstUserMessage = updatedMessages.find(
          (message) => message.role === "user"
        );

        const updatedChat: SavedChat = {
          id,
          title:
            existing?.title ??
            (firstUserMessage
              ? makeTitle(firstUserMessage.content)
              : "New chat"),
          messages: updatedMessages,
          updatedAt: Date.now(),
          documentName: docName,
          documentText: docText,
        };

        const nextChats = existing
          ? previous.chats.map((chat) =>
              chat.id === id ? updatedChat : chat
            )
          : [updatedChat, ...previous.chats];

        return {
          ...previous,
          chats: nextChats.sort((a, b) => b.updatedAt - a.updatedAt),
        };
      });
    },
    [documentName, documentText]
  );

  const newChat = useCallback(() => {
    setHistory((previous) => ({
      ...previous,
      activeChatId: null,
      messages: [],
      documentName: "",
      documentText: "",
    }));
  }, []);

  const openChat = useCallback((chat: SavedChat) => {
    setHistory((previous) => ({
      ...previous,
      activeChatId: chat.id,
      messages: chat.messages ?? [],
      documentName: chat.documentName ?? "",
      documentText: chat.documentText ?? "",
    }));
  }, []);

  const deleteChat = useCallback((id: string) => {
    setHistory((previous) => {
      const deletingActive = previous.activeChatId === id;

      return {
        ...previous,
        chats: previous.chats.filter((chat) => chat.id !== id),
        ...(deletingActive
          ? {
              activeChatId: null,
              messages: [],
              documentName: "",
              documentText: "",
            }
          : {}),
      };
    });
  }, []);

  const renameChat = useCallback((id: string, newTitle: string) => {
    const title = newTitle.trim();
    if (!title) return;

    setHistory((previous) => ({
      ...previous,
      chats: previous.chats.map((chat) =>
        chat.id === id
          ? { ...chat, title, updatedAt: Date.now() }
          : chat
      ),
    }));
  }, []);

  const updateDocument = useCallback(
    (name: string, text: string) => {
      setHistory((previous) => {
        const chatId = previous.activeChatId ?? createChatId();
        const existing = previous.chats.find(
          (chat) => chat.id === chatId
        );

        const updatedChat: SavedChat = {
          id: chatId,
          title: existing?.title ?? "New chat",
          messages: existing?.messages ?? previous.messages,
          updatedAt: Date.now(),
          documentName: name,
          documentText: text,
        };

        const nextChats = existing
          ? previous.chats.map((chat) =>
              chat.id === chatId ? updatedChat : chat
            )
          : [updatedChat, ...previous.chats];

        return {
          ...previous,
          activeChatId: chatId,
          documentName: name,
          documentText: text,
          chats: nextChats.sort((a, b) => b.updatedAt - a.updatedAt),
        };
      });
    },
    []
  );

  return {
    chats,
    setChats: (next: SavedChat[] | ((previous: SavedChat[]) => SavedChat[])) =>
      setHistory((previous) => ({
        ...previous,
        chats:
          typeof next === "function" ? next(previous.chats) : next,
      })),
    activeChatId,
    setActiveChatId: (id: string | null) =>
      setHistory((previous) => ({ ...previous, activeChatId: id })),
    messages,
    setMessages: (next: ChatMessage[] | ((previous: ChatMessage[]) => ChatMessage[])) =>
      setHistory((previous) => ({
        ...previous,
        messages:
          typeof next === "function" ? next(previous.messages) : next,
      })),
    historyLoaded,
    documentName,
    documentText,
    saveConversation,
    newChat,
    openChat,
    deleteChat,
    renameChat,
    updateDocument,
  };
}