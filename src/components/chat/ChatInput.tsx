"use client";

import {
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";

import {
  Send,
  Paperclip,
  FileText,
  X,
  Loader2,
  Square,
} from "lucide-react";

type ChatInputProps = {
  dark: boolean;
  loading: boolean;
  uploading: boolean;
  documentName: string;
  documentText: string;

  onSend: (
    text: string
  ) => void | Promise<void>;

  onStop: () => void;

  onUpload: (
    file: File
  ) => void | Promise<void>;

  onRemoveDocument: () => void;
};

export default function ChatInput({
  dark,
  loading,
  uploading,
  documentName,
  documentText,
  onSend,
  onStop,
  onUpload,
  onRemoveDocument,
}: ChatInputProps) {
  const [message, setMessage] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const hasContent =
    Boolean(message.trim()) ||
    Boolean(documentText);

  const disabled =
    uploading ||
    (!loading && !hasContent);

  const muted = dark
    ? "text-[#858585]"
    : "text-[#858072]";

  const iconButton = dark
    ? "text-[#A3A3A3] hover:bg-[#242424] hover:text-white"
    : "text-[#777064] hover:bg-[#F0E8D9] hover:text-[#292720]";

  /*
   * Resize the textarea according
   * to its real content.
   */
  function resizeTextarea(
    element: HTMLTextAreaElement
  ) {
    const minHeight = 24;
    const maxHeight = 120;

    element.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(
        element.scrollHeight,
        minHeight
      ),
      maxHeight
    );

    element.style.height =
      `${nextHeight}px`;

    /*
     * Once max height is reached,
     * allow the textarea itself to scroll.
     */
    element.style.overflowY =
      element.scrollHeight >
      maxHeight
        ? "auto"
        : "hidden";
  }

  async function handleSubmit(
    event?: FormEvent
  ) {
    event?.preventDefault();

    /*
     * When generating, the same button
     * becomes Stop.
     */
    if (loading) {
      onStop();
      return;
    }

    if (disabled) {
      return;
    }

    const text = message;

    const prompt =
      text ||
      "Please analyze the attached document and help me understand it.";

    await onSend(prompt);

    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "24px";

      textareaRef.current.style.overflowY =
        "hidden";
    }
  }

  function handleChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ) {
    setMessage(
      event.target.value
    );

    resizeTextarea(
      event.target
    );
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await onUpload(file);
    } finally {
      event.target.value = "";
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    /*
     * Enter = send.
     *
     * Shift + Enter = newline.
     */
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  return (
    <div
      className={`shrink-0 px-3 pb-2 pt-2 sm:px-6 sm:pb-4 ${
        dark
          ? "bg-black"
          : "bg-[#F5F1E8]"
      }`}
    >
      <div className="mx-auto w-full max-w-4xl">
        <form onSubmit={handleSubmit}>
          <div
            className={`flex min-h-[58px] items-center rounded-[24px] border px-3 py-2 shadow-sm transition-all duration-200 focus-within:border-[#737373] sm:px-4 ${
              dark
                ? "border-[#303030] bg-[#111111] shadow-black/20"
                : "border-[#E5DED1] bg-[#FFFCF5] shadow-[#B8AD9C]/20"
            }`}
          >
            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.markdown"
              onChange={
                handleFileChange
              }
              className="hidden"
              aria-label="Choose document"
            />

            {/* Attach */}
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                loading ||
                uploading
              }
              title="Attach document"
              aria-label="Attach document"
              className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${iconButton}`}
            >
              {uploading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Paperclip
                  size={19}
                />
              )}
            </button>

            {/* Attached document */}
            {documentName && (
              <div
                className={`mr-2 flex max-w-[130px] shrink-0 items-center gap-1 rounded-xl border px-2 py-1.5 sm:max-w-[180px] ${
                  dark
                    ? "border-[#303030] bg-[#1A1A1A]"
                    : "border-[#E5DED1] bg-[#F5F1E8]"
                }`}
                title={documentName}
              >
                <FileText
                  size={14}
                  className="shrink-0 text-blue-500"
                />

                <span className="truncate text-xs">
                  {documentName}
                </span>

                <button
                  type="button"
                  onClick={
                    onRemoveDocument
                  }
                  disabled={
                    uploading ||
                    loading
                  }
                  aria-label="Remove attached document"
                  className={`shrink-0 rounded-full p-0.5 ${muted}`}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Message */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                documentName
                  ? "Ask about document..."
                  : "Message PartnerAI..."
              }
              disabled={
                loading ||
                uploading
              }
              aria-label="Message PartnerAI"
              spellCheck={false}
              className={`min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-[#858585] disabled:opacity-60 ${
                dark
                  ? "text-[#F5F5F5]"
                  : "text-[#292720]"
              }`}
              style={{
                height: "24px",
                minHeight: "24px",
                maxHeight: "120px",
                overflowY: "hidden",
              }}
            />

            {/* Send / Stop */}
            <button
              type="submit"
              disabled={
                uploading ||
                (!loading &&
                  !hasContent)
              }
              aria-label={
                loading
                  ? "Stop generating"
                  : "Send message"
              }
              title={
                loading
                  ? "Stop generating"
                  : "Send message"
              }
              className={`ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                loading
                  ? dark
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                  : dark
                    ? "bg-[#D9FDD3] text-[#075E54] hover:bg-[#B9F6B0]"
                    : "bg-[#229ED9] text-white hover:bg-[#168AC4]"
              }`}
            >
              {loading ? (
                <Square
                  size={16}
                  fill="currentColor"
                />
              ) : (
                <Send
                  size={19}
                  strokeWidth={2.2}
                  className="translate-x-[-1px] translate-y-[1px]"
                  fill="currentColor"
                />
              )}
            </button>
          </div>
        </form>

        <p
          className={`mt-2 text-center text-[11px] leading-4 ${muted}`}
        >
          PartnerAI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}