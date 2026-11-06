
"use client";

import { useEffect, useState } from "react";

import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import Sidebar from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import WorkspaceHome from "@/components/workspace/WorkspaceHome";

import { useTheme } from "@/hooks/useTheme";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";

import type { WorkspaceName } from "@/lib/types";

export default function Home() {
  const { dark, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] =
    useState<WorkspaceName>("Chat");

  const history = useChatHistory();

  const documents = useDocuments({
    onDocumentChange: (name, text) => {
      history.updateDocument(name, text);
    },
  });

  const { restoreDocument } = documents;

useEffect(() => {
  if (!history.historyLoaded) return;

  restoreDocument(
    history.documentName ?? "",
    history.documentText ?? ""
  );
}, [
  history.historyLoaded,
  history.activeChatId,
  history.documentName,
  history.documentText,
  restoreDocument,
]);

  const chat = useChat({
    messages: history.messages,
    setMessages: history.setMessages,
    activeChatId: history.activeChatId,
    setActiveChatId: history.setActiveChatId,
    documentText: documents.docText,
    documentName: documents.docName,
    saveConversation: history.saveConversation,
    workspace: activeTool,
  });

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((previous) => !previous);
  }

  function navigateTo(name: string) {
    setActiveTool(name as WorkspaceName);
    chat.setError("");
    closeSidebar();
  }

  function newChat() {
    if (chat.loading) return;

    history.newChat();
    documents.removeDocument();
    chat.setError("");
    setActiveTool("Chat");
    closeSidebar();
  }

  function openChat(
    chatItem: (typeof history.chats)[number]
  ) {
    if (chat.loading) return;

    history.openChat(chatItem);
    setActiveTool("Chat");
    chat.setError("");
    closeSidebar();
  }

  function deleteChat(id: string) {
    history.deleteChat(id);
    chat.setError("");
  }

  function renameChat(id: string, newTitle: string) {
    history.renameChat(id, newTitle);
  }

  function removeDocument() {
    documents.removeDocument();
    history.updateDocument("", "");
  }

  function openChatWorkspace(prompt?: string) {
    setActiveTool("Chat");
    chat.setError("");
    closeSidebar();

    if (prompt?.trim()) {
      void chat.sendMessage(prompt.trim());
    }
  }

  const error = chat.error || documents.error;

  return (
    <div
      className={`flex h-dvh w-full overflow-hidden ${
        dark
          ? "bg-black text-[#F5F5F5]"
          : "bg-[#F5F1E8] text-[#292720]"
      }`}
    >
      {/* Desktop sidebar: always keep the collapsed rail visible */}
<aside
  className={`relative z-20 hidden h-full shrink-0 overflow-hidden md:block ${
    sidebarOpen ? "w-[270px]" : "w-[68px]"
  }`}
>
  <Sidebar
    open={sidebarOpen}
    dark={dark}
    activeTool={activeTool}
    documentName={documents.docName}
    chats={history.chats}
    activeChatId={history.activeChatId}
    onNewChat={newChat}
    onNavigate={navigateTo}
    onSelectChat={openChat}
    onDeleteChat={deleteChat}
    onRenameChat={renameChat}
    onToggleTheme={toggleTheme}
    onClose={closeSidebar}
    onToggle={toggleSidebar}
  />
</aside>

{/* Mobile drawer: render only when open */}
{sidebarOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <button
      type="button"
      aria-label="Close sidebar"
      onClick={closeSidebar}
      className="absolute inset-0 h-full w-full bg-black/50"
    />

    <aside className="absolute inset-y-0 left-0 z-10 w-[min(85vw,300px)] overflow-hidden shadow-2xl">
      <Sidebar
        open={true}
        dark={dark}
        activeTool={activeTool}
        documentName={documents.docName}
        chats={history.chats}
        activeChatId={history.activeChatId}
        onNewChat={newChat}
        onNavigate={navigateTo}
        onSelectChat={openChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onToggleTheme={toggleTheme}
        onClose={closeSidebar}
        onToggle={toggleSidebar}
      />
    </aside>
  </div>
)}

      {/* Main application fills all remaining width */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          dark={dark}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          onToggleTheme={toggleTheme}
        />

        {activeTool === "Chat" ? (
          <>
            {/* Chat messages */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <ChatWindow
                messages={history.messages}
                loading={chat.loading}
                error={error}
                dark={dark}
              />
            </div>

            {/* Composer stays at bottom */}
            <ChatInput
  dark={dark}
  loading={chat.loading}
  uploading={documents.uploading}
  documentName={documents.docName}
  documentText={documents.docText}
  onSend={chat.sendMessage}
  onStop={chat.stopGeneration}
  onUpload={documents.uploadDocument}
  onRemoveDocument={removeDocument}
/>
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <WorkspaceHome
              activeTool={activeTool}
              dark={dark}
              documentName={documents.docName}
              error={error}
              onOpenChat={openChatWorkspace}
            />

            {activeTool === "Documents" && (
              <div className="mx-auto w-full max-w-3xl px-4 pb-8">
                <div
                  className={`rounded-2xl border p-5 ${
                    dark
                      ? "border-[#303030] bg-[#111111]"
                      : "border-[#E5DED1] bg-[#FFFCF5]"
                  }`}
                >
                  <h3 className="mb-2 font-semibold">
                    Upload a document
                  </h3>

                  <p className="mb-4 text-sm text-[#858585]">
                    Upload a PDF, DOCX, TXT, or Markdown file to ask
                    questions about its contents.
                  </p>

                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown"
                    disabled={documents.uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];

                      try {
                        if (file) {
                          await documents.uploadDocument(file);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        event.target.value = "";
                      }
                    }}
                    className="block w-full text-sm"
                  />

                  {documents.uploading && (
                    <p className="mt-3 text-sm text-blue-500">
                      Processing document...
                    </p>
                  )}

                  {documents.docName && (
                    <div
                      className={`mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 ${
                        dark
                          ? "border-[#303030]"
                          : "border-[#E5DED1]"
                      }`}
                    >
                      <span className="truncate text-sm">
                        {documents.docName}
                      </span>

                      <button
                        type="button"
                        onClick={removeDocument}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {documents.docName && (
                    <button
                      type="button"
                      onClick={() => openChatWorkspace()}
                      className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Ask questions about this document
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}