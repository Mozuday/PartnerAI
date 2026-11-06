"use client";

import { useState } from "react";

import {
  Download,
  FileText,
  X,
} from "lucide-react";

import ChatMessage from "./ChatMessage";

type Source = {
  title: string;
  url: string;
  snippet: string;
  source?: "Web" | "Website";
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type ChatWindowProps = {
  messages: Message[];
  loading: boolean;
  error: string;
  dark: boolean;
};

export default function ChatWindow({
  messages,
  loading,
  error,
  dark,
}: ChatWindowProps) {
  const [exportOpen, setExportOpen] =
    useState(false);

  const hasMessages =
    messages.some((message) =>
      message.content.trim()
    );

  function exportChat(
    format: "txt" | "md"
  ) {
    const completedMessages =
      messages.filter((message) =>
        message.content.trim()
      );

    if (!completedMessages.length) {
      return;
    }

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const content =
      format === "md"
        ? `# PartnerAI Conversation\n\nExported on ${date}\n\n` +
          completedMessages
            .map((message) => {
              const role =
                message.role ===
                "user"
                  ? "You"
                  : "PartnerAI";

              const sources =
                message.sources?.length
                  ? "\n\n### Sources\n" +
                    message.sources
                      .map(
                        (source) =>
                          `- [${source.title}](${source.url})`
                      )
                      .join("\n")
                  : "";

              return (
                `## ${role}\n\n` +
                `${message.content.trim()}` +
                sources
              );
            })
            .join(
              "\n\n---\n\n"
            )
        : `PartnerAI Conversation\nExported on ${date}\n\n` +
          completedMessages
            .map((message) => {
              const role =
                message.role ===
                "user"
                  ? "You"
                  : "PartnerAI";

              const sources =
                message.sources?.length
                  ? "\n\nSources:\n" +
                    message.sources
                      .map(
                        (source) =>
                          `${source.title}\n${source.url}`
                      )
                      .join("\n\n")
                  : "";

              return (
                `${role}:\n` +
                `${message.content.trim()}` +
                sources
              );
            })
            .join(
              "\n\n------------------------------\n\n"
            );

    const blob = new Blob(
      ["\uFEFF", content],
      {
        type:
          format === "md"
            ? "text/markdown;charset=utf-8"
            : "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `PartnerAI-chat-${date}.${format}`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(url),
      1000
    );

    setExportOpen(false);
  }

  return (
    <div
      className={`relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden ${
        dark
          ? "bg-black text-[#F5F5F5]"
          : "bg-[#F5F1E8] text-[#292720]"
      }`}
    >
      {/* Messages */}
      <div
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
        aria-live="polite"
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <div className="my-auto flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold shadow-lg ${
                  dark
                    ? "bg-[#F5F5F5] text-black"
                    : "bg-[#292720] text-white"
                }`}
              >
                P
              </div>

              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                How can I help you today?
              </h2>

              <p
                className={`mt-3 max-w-md text-sm leading-6 ${
                  dark
                    ? "text-[#858585]"
                    : "text-[#858072]"
                }`}
              >
                Ask anything, explore your documents, or work on something new.
              </p>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {messages.map(
                (message, index) => (
                  <div
                    key={index}
                    className="min-w-0"
                  >
                    <ChatMessage
                      role={
                        message.role
                      }
                      content={
                        message.content
                      }
                      dark={dark}
                      sources={
                        message.sources?.map(
                          (source) => ({
                            title:
                              source.title,
                            url:
                              source.url,
                            snippet:
                              source.snippet,
                            source:
                              source.source ??
                              "Web",
                          })
                        ) ?? []
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-5 flex items-center gap-2 text-sm">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />

                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />

                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
              </span>

              <span
                className={
                  dark
                    ? "text-[#858585]"
                    : "text-[#858072]"
                }
              >
                PartnerAI is thinking...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Export */}
      {hasMessages && (
        <div className="absolute bottom-4 right-4 z-40 sm:bottom-5 sm:right-6">
          {exportOpen && (
            <>
              <button
                type="button"
                aria-label="Close export menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() =>
                  setExportOpen(false)
                }
              />

              <div
                role="menu"
                className={`absolute bottom-full right-0 z-20 mb-3 w-56 overflow-hidden rounded-2xl border p-2 shadow-2xl ${
                  dark
                    ? "border-[#303030] bg-[#111111] shadow-black/50"
                    : "border-[#E5DED1] bg-[#FFFCF5] shadow-[#B8AD9C]/30"
                }`}
              >
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400">
                    EXPORT CONVERSATION
                  </p>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    exportChat("md")
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    dark
                      ? "text-[#E5E5E5] hover:bg-[#1A1A1A]"
                      : "text-[#4B463D] hover:bg-[#F0E8D9]"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <FileText
                      size={18}
                    />
                  </span>

                  <span>
                    <span className="block text-sm font-medium">
                      Markdown
                    </span>

                    <span className="mt-0.5 block text-xs text-gray-400">
                      Formatted .md file
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    exportChat("txt")
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    dark
                      ? "text-[#E5E5E5] hover:bg-[#1A1A1A]"
                      : "text-[#4B463D] hover:bg-[#F0E8D9]"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Download
                      size={18}
                    />
                  </span>

                  <span>
                    <span className="block text-sm font-medium">
                      Plain text
                    </span>

                    <span className="mt-0.5 block text-xs text-gray-400">
                      Simple .txt file
                    </span>
                  </span>
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setExportOpen(
                (previous) =>
                  !previous
              )
            }
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            aria-label="Export conversation"
            title="Export conversation"
            className={`flex h-11 items-center gap-2 rounded-full border px-4 shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 ${
              dark
                ? "border-[#303030] bg-[#111111] text-[#F5F5F5] hover:bg-[#1C1C1C]"
                : "border-[#E5DED1] bg-[#FFFCF5] text-[#292720] hover:bg-[#F0E8D9]"
            }`}
          >
            {exportOpen ? (
              <X size={17} />
            ) : (
              <Download size={17} />
            )}

            <span className="text-sm font-medium">
              Export
            </span>
          </button>
        </div>
      )}
    </div>
  );
}