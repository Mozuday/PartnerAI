"use client";

import { useRef, useState } from "react";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  ChatMessage,
  SearchResult,
  WorkspaceName,
} from "@/lib/types";

import { createChatId } from "@/lib/chat-utils";

import {
  getRelevantDocumentContext,
} from "@/lib/document-processing";

type UseChatOptions = {
  messages: ChatMessage[];

  setMessages: Dispatch<
    SetStateAction<ChatMessage[]>
  >;

  activeChatId: string | null;

  setActiveChatId: (
    id: string | null
  ) => void;

  documentText: string;

  documentName: string;

  saveConversation: (
    id: string,
    messages: ChatMessage[],
    docName?: string,
    docText?: string
  ) => void;

  workspace: WorkspaceName;
};

export function useChat({
  messages,
  setMessages,
  activeChatId,
  setActiveChatId,
  documentText,
  documentName,
  saveConversation,
  workspace,
}: UseChatOptions) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * Keeps track of the current AI request.
   *
   * stopGeneration() uses this controller
   * to actually cancel the fetch request.
   */
  const abortControllerRef =
    useRef<AbortController | null>(null);

  /*
   * Used to distinguish a normal error
   * from the user intentionally stopping
   * generation.
   */
  const stoppedRef =
    useRef(false);

  async function sendMessage(text: string) {
    const trimmedText = text.trim();

    if (!trimmedText || loading) {
      return;
    }

    const chatId =
      activeChatId || createChatId();

    const updatedMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: trimmedText,
      },
    ];

    setActiveChatId(chatId);

    setMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: "",
        sources: [],
      },
    ]);

    setError("");
    setLoading(true);
    stoppedRef.current = false;

    /*
     * Create a fresh controller for every request.
     */
    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    saveConversation(
      chatId,
      updatedMessages,
      documentName,
      documentText
    );

    const messageSources: SearchResult[] =
      [];

    try {
      const apiWorkspace =
        workspace === "Business & CA"
          ? "CA"
          : workspace === "Coding"
            ? "Coder"
            : workspace;

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            messages: updatedMessages,

            documentContext:
              getRelevantDocumentContext(
                documentText,
                trimmedText
              ),

            workspace: apiWorkspace,
          }),

          /*
           * This is what makes Stop actually
           * cancel the network request.
           */
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data.error ||
            "AI request failed."
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming is not supported by this response."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";
      let assistantReply = "";
      let streamFinished = false;

      function updateAssistantMessage(
        content: string
      ) {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content,
            sources: messageSources,
          },
        ]);
      }

      function processEvent(
        event: string
      ) {
        const lines =
          event.split("\n");

        const errorLine =
          lines.find((line) =>
            line.startsWith(
              "event: error"
            )
          );

        const sourceEvent =
          lines.some((line) =>
            line.startsWith(
              "event: sources"
            )
          );

        const dataLines = lines
          .filter((line) =>
            line.startsWith("data:")
          )
          .map((line) =>
            line.slice(5).trim()
          );

        if (
          dataLines.length === 0
        ) {
          return;
        }

        const data =
          dataLines.join("\n");

        /*
         * ERROR
         */
        if (errorLine) {
          let message =
            "An error occurred while generating the response.";

          try {
            const parsed =
              JSON.parse(data);

            message =
              typeof parsed === "string"
                ? parsed
                : parsed.error ||
                  message;
          } catch {
            // Keep default message.
          }

          throw new Error(message);
        }

        /*
         * SOURCES
         */
        if (sourceEvent) {
          try {
            const sources =
              JSON.parse(data);

            if (
              Array.isArray(sources)
            ) {
              messageSources.length =
                0;

              messageSources.push(
                ...(sources as SearchResult[])
              );

              updateAssistantMessage(
                assistantReply
              );
            }
          } catch {
            throw new Error(
              "Invalid source data from the server."
            );
          }

          return;
        }

        /*
         * END OF STREAM
         */
        if (data === "[DONE]") {
          streamFinished = true;
          return;
        }

        /*
         * ASSISTANT CHUNK
         */
        let chunk: unknown;

        try {
          chunk =
            JSON.parse(data);
        } catch {
          throw new Error(
            "Invalid streaming response from the server."
          );
        }

        if (
          typeof chunk === "string"
        ) {
          assistantReply += chunk;

          updateAssistantMessage(
            assistantReply
          );
        }
      }

      try {
        while (!streamFinished) {
          const {
            done,
            value,
          } = await reader.read();

          if (done) {
            buffer +=
              decoder.decode();

            break;
          }

          buffer +=
            decoder.decode(value, {
              stream: true,
            });

          const events =
            buffer.split("\n\n");

          buffer =
            events.pop() ?? "";

          for (const event of events) {
            if (!event.trim()) {
              continue;
            }

            processEvent(event);

            if (streamFinished) {
              break;
            }
          }
        }

        /*
         * Process any final incomplete event.
         */
        if (
          !streamFinished &&
          buffer.trim()
        ) {
          processEvent(buffer);
        }
      } finally {
        await reader
          .cancel()
          .catch(() => {});

        reader.releaseLock();
      }

      /*
       * If the user stopped generation,
       * keep whatever response was already
       * generated instead of treating it
       * as an error.
       */
      if (stoppedRef.current) {
        const stoppedMessages: ChatMessage[] =
          [
            ...updatedMessages,
            {
              role: "assistant",
              content:
                assistantReply ||
                "Generation stopped.",
              sources:
                messageSources,
            },
          ];

        setMessages(
          stoppedMessages
        );

        saveConversation(
          chatId,
          stoppedMessages,
          documentName,
          documentText
        );

        return;
      }

      if (!assistantReply.trim()) {
        throw new Error(
          "No response was generated by Ollama."
        );
      }

      const completedMessages: ChatMessage[] =
        [
          ...updatedMessages,
          {
            role: "assistant",
            content:
              assistantReply,
            sources:
              messageSources,
          },
        ];

      setMessages(
        completedMessages
      );

      saveConversation(
        chatId,
        completedMessages,
        documentName,
        documentText
      );
    } catch (err) {
      /*
       * AbortError means the user clicked Stop.
       *
       * Do NOT show an error.
       */
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        return;
      }

      /*
       * Some browsers / runtimes may
       * report the abort differently.
       */
      if (
        stoppedRef.current &&
        controller.signal.aborted
      ) {
        return;
      }

      setMessages(
        updatedMessages
      );

      saveConversation(
        chatId,
        updatedMessages,
        documentName,
        documentText
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to Ollama."
      );
    } finally {
      /*
       * Only clear the controller if
       * it is still this request's controller.
       */
      if (
        abortControllerRef.current ===
        controller
      ) {
        abortControllerRef.current =
          null;
      }

      setLoading(false);
    }
  }

  /*
   * Stop the current AI generation.
   */
  function stopGeneration() {
    if (!loading) {
      return;
    }

    stoppedRef.current = true;

    abortControllerRef.current?.abort();
  }

  return {
    loading,
    error,
    setError,
    sendMessage,
    stopGeneration,
  };
}