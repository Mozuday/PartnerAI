"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type DocumentResult = {
  success: boolean;
  name: string;
  text: string;
  characters: number;
};

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] =
    useState<DocumentResult | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");

  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showText, setShowText] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const controllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected = event.target.files?.[0] ?? null;

    setFile(selected);
    setError("");
    setNotice("");
  }

  async function uploadDocument() {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    setDocument(null);
    setMessages([]);
    setShowText(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Document processing failed."
        );
      }

      if (
        !result.success ||
        typeof result.text !== "string" ||
        !result.text.trim()
      ) {
        throw new Error(
          "No readable text was returned by the document API."
        );
      }

      setDocument(result as DocumentResult);
      setNotice("Document processed successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not process the document."
      );
    } finally {
      setUploading(false);
    }
  }

  async function askQuestion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!document || !question.trim() || thinking) {
      return;
    }

    const userQuestion = question.trim();

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: userQuestion,
      },
    ];

    setMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: "",
      },
    ]);

    setQuestion("");
    setError("");
    setThinking(true);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedMessages,
          documentContext: document.text,
          workspace: "Documents",
        }),
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => null);

        throw new Error(
          result?.error || "The AI could not answer your question."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let answer = "";

      function processEvent(eventText: string) {
        const lines = eventText.split(/\r?\n/);

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6);

          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (typeof parsed === "string") {
              answer += parsed;
            }
          } catch {
            // Ignore malformed stream events.
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          processEvent(eventText);
        }

        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: answer,
          },
        ]);
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        processEvent(buffer);
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: answer || "No response was generated.",
        },
      ]);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while answering."
      );

      setMessages((current) => {
        const last = current[current.length - 1];

        if (last?.role === "assistant" && !last.content) {
          return current.slice(0, -1);
        }

        return current;
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setThinking(false);
      }
    }
  }

  function stopGeneration() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setThinking(false);
  }

  function resetDocument() {
    stopGeneration();
    setFile(null);
    setDocument(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setNotice("");
    setShowText(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400">
            PARTNERAI WORKSPACE
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Documents
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Upload documents, extract readable text, and ask
            questions about their contents.
          </p>
        </header>

        {!document ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Upload a document
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                PDF, DOCX, TXT, or Markdown · Maximum 10 MB
              </p>
            </div>

            <label
              htmlFor="document-upload"
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-4 py-8 text-center transition hover:border-blue-500 dark:border-zinc-700 dark:hover:border-blue-400"
            >
              <span className="mb-3 text-3xl">↑</span>

              <span className="font-medium">
                {file ? file.name : "Choose a document"}
              </span>

              <span className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Select a file from your computer
              </span>

              <input
                id="document-upload"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>

            {file && (
              <p className="mt-3 text-sm text-zinc-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}

            <button
              type="button"
              onClick={uploadDocument}
              disabled={!file || uploading}
              className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {uploading
                ? "Processing document..."
                : "Upload and extract text"}
            </button>

            {uploading && (
              <p className="mt-3 text-sm text-zinc-500">
                Scanned PDFs may take longer because OCR is running.
              </p>
            )}
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Current document
                  </p>

                  <h2 className="mt-2 break-words font-semibold">
                    {document.name}
                  </h2>
                </div>

                <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Ready
                </span>
              </div>

              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between gap-3">
                  <span>Extracted characters</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {document.characters.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Format</span>
                  <span className="uppercase">
                    {document.name.split(".").pop()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowText((value) => !value)}
                className="mt-5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {showText ? "Hide extracted text" : "Preview extracted text"}
              </button>

              {showText && (
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-xs leading-5 dark:bg-zinc-950">
                  {document.text}
                </pre>
              )}

              <button
                type="button"
                onClick={resetDocument}
                className="mt-3 w-full rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Remove document
              </button>
            </aside>

            <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <h2 className="font-semibold">
                  Chat with your document
                </h2>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Answers use the extracted document content.
                </p>
              </div>

              <div className="flex-1 space-y-5 p-5">
                {messages.length === 0 && (
                  <div className="rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/60">
                    <p className="font-medium">
                      What would you like to know?
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        "Summarize this document",
                        "List the important points",
                        "Extract names and dates",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setQuestion(suggestion)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[90%] rounded-2xl bg-blue-600 px-4 py-3 text-white"
                        : "mr-auto max-w-[95%] rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800"
                    }
                  >
                    <p className="mb-2 text-xs font-semibold opacity-70">
                      {message.role === "user" ? "You" : "PartnerAI"}
                    </p>

                    <div className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content ||
                        (thinking && index === messages.length - 1
                          ? "Thinking..."
                          : "")}
                    </div>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={askQuestion}
                className="border-t border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-end gap-3">
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        if (!thinking) {
                          event.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    placeholder="Ask something about your document..."
                    rows={2}
                    disabled={thinking}
                    className="min-h-12 flex-1 resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />

                  {thinking ? (
                    <button
                      type="button"
                      onClick={stopGeneration}
                      className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!question.trim()}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Send
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  Enter to send · Shift + Enter for a new line
                </p>
              </form>
            </section>
          </div>
        )}

        {notice && (
          <p className="mt-4 text-sm text-green-700 dark:text-green-400">
            {notice}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}
      </div>
    </main>
  );
}