"use client";

import { useState } from "react";
import {
  Copy,
  Check,
} from "lucide-react";

type ChatSource = {
  title: string;
  url: string;
  snippet: string;
  source: "Web" | "Website";
};

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  dark: boolean;
  sources?: ChatSource[];
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return url;
  }
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(
    /(\*\*[\s\S]*?\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s)]+)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong
          key={index}
          className="font-semibold"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    const markdownLink = part.match(
      /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/
    );

    if (markdownLink) {
      const [, label, url] =
        markdownLink;

      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
        >
          {label}
        </a>
      );
    }

    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
        >
          {part}
        </a>
      );
    }

    const cleaned = part.replace(
      /\\([.*_#\-+])/g,
      "$1"
    );

    return (
      <span key={index}>
        {cleaned}
      </span>
    );
  });
}

function renderText(text: string) {
  const normalized = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalized.split("\n");

  return (
    <div className="space-y-0">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return (
            <div
              key={`empty-${index}`}
              className="h-3"
            />
          );
        }

        const numberedMatch =
          trimmed.match(
            /^(\d+)[.)]\s+(.*)$/
          );

        if (numberedMatch) {
          return (
            <div
              key={`number-${index}`}
              className="flex gap-2 leading-7"
            >
              <span className="shrink-0 font-medium">
                {numberedMatch[1]}.
              </span>

              <span className="min-w-0">
                {renderInlineMarkdown(
                  numberedMatch[2]
                )}
              </span>
            </div>
          );
        }

        const bulletMatch =
          trimmed.match(
            /^[-•*]\s+(.*)$/
          );

        if (bulletMatch) {
          return (
            <div
              key={`bullet-${index}`}
              className="flex gap-2 leading-7"
            >
              <span className="shrink-0">
                •
              </span>

              <span className="min-w-0">
                {renderInlineMarkdown(
                  bulletMatch[1]
                )}
              </span>
            </div>
          );
        }

        return (
          <div
            key={`line-${index}`}
            className="min-h-7 leading-7"
          >
            {renderInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}

export default function ChatMessage({
  role,
  content,
  dark,
  sources = [],
}: ChatMessageProps) {
  const isUser = role === "user";

  const [copied, setCopied] =
    useState(false);

  const parts = content.split(
    /(```[\s\S]*?```)/g
  );

  async function copyUserMessage() {
    try {
      await navigator.clipboard.writeText(
        content
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(
        code
      );
    } catch {
      // Ignore clipboard errors.
    }
  }

  return (
    <div
      className={`flex w-full ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {/* User message column */}
      <div
        className={
          isUser
            ? "flex max-w-[90%] flex-col items-end sm:max-w-[80%]"
            : "w-fit max-w-[90%] sm:max-w-[80%]"
        }
      >
        {/* Message bubble/content */}
        <div
          className={
            isUser
              ? "w-fit max-w-full break-words rounded-2xl rounded-br-md bg-blue-100 px-4 py-3 text-sm leading-7 text-gray-900 dark:bg-neutral-800 dark:text-gray-100"
              : dark
                ? "w-full break-words text-gray-200"
                : "w-full break-words text-gray-800"
          }
        >
          <div
            className={
              isUser
                ? ""
                : "text-[15px] leading-7"
            }
          >
            {parts.map((part, index) => {
              if (
                part.startsWith("```") &&
                part.endsWith("```")
              ) {
                const lines =
                  part.split("\n");

                const language =
                  lines[0]
                    .replace(
                      "```",
                      ""
                    )
                    .trim();

                const code = lines
                  .slice(1, -1)
                  .join("\n")
                  .replace(
                    /^\n+|\n+$/g,
                    ""
                  );

                return (
                  <div
                    key={index}
                    className={`my-4 overflow-hidden rounded-xl border ${
                      dark
                        ? "border-neutral-800"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Code header */}
                    <div
                      className={`flex h-9 items-center justify-between border-b px-3 ${
                        dark
                          ? "border-neutral-800 bg-neutral-900 text-neutral-400"
                          : "border-gray-200 bg-gray-100 text-gray-500"
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        {language || "Code"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          void copyCode(code)
                        }
                        aria-label="Copy code"
                        title="Copy code"
                        className={`rounded-md p-1.5 transition ${
                          dark
                            ? "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                            : "text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                        }`}
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    {/* Code */}
                    <pre
                      className={`overflow-x-auto p-4 font-mono text-[13px] leading-6 ${
                        dark
                          ? "bg-[#0A0A0A] text-gray-200"
                          : "bg-[#F8F8F8] text-gray-800"
                      }`}
                    >
                      <code>{code}</code>
                    </pre>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className="break-words"
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {renderText(part)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Copy icon — completely outside the user bubble */}
        {isUser && (
          <button
            type="button"
            onClick={copyUserMessage}
            aria-label={
              copied
                ? "Copied"
                : "Copy message"
            }
            title={
              copied
                ? "Copied"
                : "Copy message"
            }
            className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
              dark
                ? "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
                : "text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            {copied ? (
              <Check size={14} />
            ) : (
              <Copy size={14} />
            )}
          </button>
        )}

        {/* Sources */}
        {!isUser &&
          sources.length > 0 && (
            <div className="mt-6 w-full border-t border-gray-200 pt-4 dark:border-neutral-800">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-medium">
                  Sources
                </span>

                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {sources.length}
                </span>
              </div>

              <div className="space-y-2">
                {sources.map(
                  (source, index) => {
                    const domain =
                      getDomain(
                        source.url
                      );

                    return (
                      <a
                        key={`${source.url}-${index}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group block rounded-xl border p-3 transition ${
                          dark
                            ? "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                              source.source ===
                              "Website"
                                ? dark
                                  ? "bg-blue-950 text-blue-300"
                                  : "bg-blue-100 text-blue-700"
                                : dark
                                  ? "bg-neutral-800 text-neutral-300"
                                  : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {source.source ===
                            "Website"
                              ? "🌐"
                              : "🔎"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`line-clamp-2 text-sm font-medium ${
                                  dark
                                    ? "text-gray-200 group-hover:text-white"
                                    : "text-gray-800 group-hover:text-black"
                                }`}
                              >
                                {source.title ||
                                  domain}
                              </p>

                              <span className="shrink-0 text-xs text-gray-400 transition group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                ↗
                              </span>
                            </div>

                            <p
                              className={`mt-1 truncate text-xs ${
                                dark
                                  ? "text-neutral-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {domain}
                            </p>

                            {source.snippet && (
                              <p
                                className={`mt-2 line-clamp-2 text-xs leading-5 ${
                                  dark
                                    ? "text-neutral-400"
                                    : "text-gray-600"
                                }`}
                              >
                                {source.snippet}
                              </p>
                            )}

                            <div className="mt-2">
                              <span
                                className={`text-[10px] uppercase tracking-wide ${
                                  dark
                                    ? "text-neutral-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {source.source ===
                                "Website"
                                  ? "Website"
                                  : "Web Search"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  }
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}