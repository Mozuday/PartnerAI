
"use client";

import { useState } from "react";
import Image from "next/image";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SavedChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type SidebarProps = {
  open: boolean;
  dark: boolean;
  activeTool: string;
  documentName: string;
  onNewChat: () => void;
  onNavigate: (name: string) => void;
  onToggleTheme: () => void;
  onClose: () => void;
  onToggle: () => void;
  chats: SavedChat[];
  activeChatId: string | null;
  onSelectChat: (chat: SavedChat) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
};

const navigation = [
  { icon: "✧", name: "Chat", description: "Your AI assistant" },
  { icon: "▤", name: "Documents", description: "Read and analyze files" },
  { icon: "₹", name: "Business & CA", description: "Business workspace" },
  { icon: "</>", name: "Coding", description: "Coding workspace" },
];

type ChatHistoryItemProps = {
  chat: SavedChat;
  active: boolean;
  dark: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
};

function ChatHistoryItem({
  chat,
  active,
  dark,
  onSelect,
  onDelete,
  onRename,
}: ChatHistoryItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);

  function saveRename() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onRename(trimmed);
    setEditing(false);
  }

  function cancelRename() {
    setTitle(chat.title);
    setEditing(false);
  }

  return (
    <div
      className={`group relative flex min-w-0 items-center gap-1 rounded-xl transition-colors ${
        active
          ? dark
            ? "bg-[#1A1A1A] text-white"
            : "bg-[#E8E1D4] text-[#292720]"
          : dark
            ? "text-[#B3B3B3] hover:bg-[#111111]"
            : "text-[#777267] hover:bg-[#EAE4D9]"
      }`}
    >
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1 p-1"
          onSubmit={(event) => {
            event.preventDefault();
            saveRename();
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelRename();
            }}
            maxLength={80}
            aria-label="Rename conversation"
            className={`min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm outline-none focus:border-blue-500 ${
              dark
                ? "border-[#333333] bg-black text-white"
                : "border-[#E5DED1] bg-[#FFFCF5] text-[#292720]"
            }`}
          />

          <button
            type="submit"
            title="Save name"
            aria-label="Save name"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-500/10"
          >
            ✓
          </button>

          <button
            type="button"
            onClick={cancelRename}
            title="Cancel"
            aria-label="Cancel rename"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-500/10"
          >
            ×
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            title={chat.title}
            className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${
              active ? "font-medium" : ""
            }`}
          >
            {chat.title}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((previous) => !previous)}
            aria-label={`Options for ${chat.title}`}
            title="Chat options"
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-500/10 hover:text-current md:opacity-0 md:group-hover:opacity-100"
          >
            ⋯
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close chat options"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />

              <div
                className={`absolute right-2 top-10 z-50 w-36 overflow-hidden rounded-xl border p-1 shadow-xl ${
                  dark
                    ? "border-[#303030] bg-[#111111]"
                    : "border-[#E5DED1] bg-[#FFFCF5]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTitle(chat.title);
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-500/10"
                >
                  <span>✎</span>
                  Rename
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10"
                >
                  <span>×</span>
                  Delete
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function Sidebar({
  open,
  dark,
  activeTool,
  documentName,
  onNewChat,
  onNavigate,
  onToggle,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: SidebarProps) {
  const muted = dark ? "text-[#858585]" : "text-[#858072]";

  const base =
    "flex items-center justify-center rounded-xl transition-colors duration-200";

  function navigate(name: string) {
    onNavigate(name);

    if (window.matchMedia("(max-width: 767px)").matches) {
      onClose();
    }
  }

  return (
    <>

{/* Collapsed icon rail */}
<aside
  className={`${
    open ? "hidden" : "flex"
  } h-full w-[68px] shrink-0 flex-col items-center border-r py-4 transition-colors duration-300 ${
    dark
      ? "border-[#262626] bg-black"
      : "border-[#E5DED1] bg-[#F5F1E8]"
  }`}
>
        <button
  type="button"
  onClick={onToggle}
  title="Expand sidebar"
  aria-label="Expand sidebar"
  className={`${base} mb-7 h-10 w-10 overflow-hidden rounded-xl`}
>
  <Image
    src="/partnerai-icon.png"
    alt="PartnerAI"
    width={40}
    height={40}
    priority
    className="h-full w-full object-contain"
  />
</button>

        <nav className="flex w-full flex-col items-center gap-2 px-2">
          {navigation.map((item) => {
            const active = activeTool === item.name;

            return (
              <button
                key={item.name}
                type="button"
                title={item.name}
                aria-label={item.name}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.name)}
                className={`${base} h-11 w-11 text-base ${
                  active
                    ? dark
                      ? "bg-[#1A1A1A] text-blue-300"
                      : "bg-[#E8E1D4] text-blue-800"
                    : `${muted} hover:bg-black/5 dark:hover:bg-[#111111]`
                }`}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <div
            title="Local AI · Ollama"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#303030]"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>

      {/* Expanded sidebar / mobile drawer */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col overflow-hidden border-r transition-transform duration-300 ease-in-out md:relative md:inset-y-auto md:left-auto md:z-auto md:h-full md:shrink-0 md:transition-[width] md:duration-300 ${
          dark
            ? "border-[#262626] bg-black text-[#F5F5F5]"
            : "border-[#E5DED1] bg-[#F5F1E8] text-[#292720]"
        } ${
          open
            ? "translate-x-0 md:w-[270px]"
            : "-translate-x-full md:w-0 md:translate-x-0 md:border-r-0"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center justify-between px-5">
          <button
  type="button"
  onClick={onNewChat}
  className="flex min-w-0 items-center gap-3 rounded-xl text-left"
>
  <Image
  src="/partnerai-icon.png"
  alt="PartnerAI"
  width={40}
  height={40}
  priority
  className="h-10 w-10 shrink-0 object-contain"
/>

  <span className="min-w-0">
    <span className="block text-base font-semibold tracking-tight">
      PartnerAI
    </span>

    <span className={`mt-0.5 block text-xs ${muted}`}>
      Your AI partner
    </span>
  </span>
</button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-black/5 dark:hover:bg-[#1A1A1A] md:hidden"
          >
            ✕
          </button>
        </div>

        {/* New chat */}
        <div className="shrink-0 px-4 pb-6">
          <button
            type="button"
            onClick={onNewChat}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              dark
                ? "border-[#262626] bg-[#111111] hover:bg-[#1A1A1A]"
                : "border-[#E5DED1] bg-[#FFFCF5] hover:bg-[#EAE4D9]"
            }`}
          >
            <span className="text-lg">＋</span>
            New chat
          </button>
        </div>

        {/* Workspace navigation */}
        <div className="shrink-0 px-4">
          <p
            className={`mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest ${muted}`}
          >
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = activeTool === item.name;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => navigate(item.name)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                    active
                      ? dark
                        ? "bg-[#1A1A1A] font-medium text-blue-300"
                        : "bg-[#E8E1D4] font-medium text-blue-800"
                      : dark
                        ? "text-[#A3A3A3] hover:bg-[#111111]"
                        : "text-[#777267] hover:bg-[#EAE4D9]"
                  }`}
                >
                  <span className="flex w-6 items-center justify-center text-base">
                    {item.icon}
                  </span>

                  <span className="flex-1 text-left">{item.name}</span>

                  {item.name === "Documents" && documentName && (
                    <span className="text-xs text-emerald-500">✓</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Chat history */}
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-4">
          <div className="mb-3 flex items-center justify-between px-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-widest ${muted}`}
            >
              Recent chats
            </p>

            {chats.length > 0 && (
              <span className={`text-xs ${muted}`}>{chats.length}</span>
            )}
          </div>

          {chats.length === 0 ? (
            <p className={`px-3 py-3 text-xs leading-5 ${muted}`}>
              Your conversations will appear here.
            </p>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  active={activeChatId === chat.id}
                  dark={dark}
                  onSelect={() => onSelectChat(chat)}
                  onDelete={() => onDeleteChat(chat.id)}
                  onRename={(newTitle) =>
                    onRenameChat(chat.id, newTitle)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="mt-auto shrink-0 space-y-4 p-4">
          {documentName && (
            <div
              className={`rounded-xl border p-3 ${
                dark
                  ? "border-[#303030] bg-[#111111]"
                  : "border-[#E5DED1] bg-[#FFFCF5]"
              }`}
            >
              <p className="mb-1 text-xs font-medium text-blue-500">
                Attached document
              </p>
              <p className="truncate text-sm">{documentName}</p>
            </div>
          )}

          <div
            className={`flex items-center gap-3 border-t pt-4 ${
              dark ? "border-[#262626]" : "border-[#E5DED1]"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                dark
                  ? "bg-[#1A1A1A] text-gray-200"
                  : "bg-[#EAE4D9] text-[#5D594E]"
              }`}
            >
              U
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium">Uday</p>
              <p className={`mt-0.5 text-xs ${muted}`}>
                Personal workspace
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}