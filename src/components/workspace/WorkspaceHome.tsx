"use client";

import { useState } from "react";

// ============================================================
// Types
// ============================================================

type WorkspaceHomeProps = {
  activeTool: string;
  dark: boolean;
  documentName: string | null;
  error: string | null;
  onOpenChat: (prompt?: string) => void;
};

type AnalysisResponse = {
  success: boolean;
  analysis?: string;
  model?: string;
  error?: string;
  message?: string;
};

type WorkspaceAction = {
  icon: string;
  title: string;
  description: string;
  prompt: string;
};

// ============================================================
// Workspace content
// ============================================================

const caTopics: WorkspaceAction[] = [
  {
    icon: "📚",
    title: "CA Foundation",
    description: "Accounting, business laws, mathematics and economics.",
    prompt:
      "Help me study CA Foundation. Explain the main subjects and create a beginner-friendly study plan.",
  },
  {
    icon: "📊",
    title: "CA Intermediate",
    description: "Advanced accounting, taxation, audit and costing.",
    prompt:
      "Help me study CA Intermediate. Explain the subjects and give me a structured study plan.",
  },
  {
    icon: "🧾",
    title: "GST & Income Tax",
    description: "Tax concepts, calculations and practical examples.",
    prompt:
      "Teach me GST and Income Tax using practical examples and step-by-step calculations. Mention when rules need verification against current official sources.",
  },
  {
    icon: "✍️",
    title: "Accounting Entries",
    description: "Journal entries, ledgers and financial statements.",
    prompt:
      "Teach me accounting journal entries with examples, explanations, and practice questions.",
  },
  {
    icon: "🔍",
    title: "Audit & Standards",
    description: "Auditing concepts and accounting standards.",
    prompt:
      "Explain auditing concepts and accounting standards with simple examples and revision notes.",
  },
  {
    icon: "📝",
    title: "Practice Questions",
    description: "MCQs, numerical problems and exam-style practice.",
    prompt:
      "Start a CA exam practice session. Ask me one question at a time and explain the answer after I respond.",
  },
];

const documentActions: WorkspaceAction[] = [
  {
    icon: "✦",
    title: "Summarize a file",
    description: "Get the main points and key takeaways.",
    prompt:
      "Help me summarize my attached document into clear, organized key points.",
  },
  {
    icon: "❓",
    title: "Ask questions",
    description: "Find answers from your document's content.",
    prompt:
      "I want to ask questions about my attached document. Answer using the document's content.",
  },
  {
    icon: "📖",
    title: "Explain a topic",
    description: "Understand difficult paragraphs in simple language.",
    prompt:
      "Explain the difficult topics in my attached document in simple language with examples.",
  },
  {
    icon: "📝",
    title: "Make study notes",
    description: "Turn material into organized revision notes.",
    prompt:
      "Turn my attached document into organized study notes with headings and important points.",
  },
  {
    icon: "🔎",
    title: "Find key information",
    description: "Look for important details and sections.",
    prompt:
      "Help me find and organize the important information in my attached document.",
  },
  {
    icon: "📋",
    title: "Create questions",
    description: "Generate practice questions from study material.",
    prompt:
      "Create practice questions and MCQs from my attached document, with answers and explanations.",
  },
];

const codingActions: WorkspaceAction[] = [
  {
    icon: "⌘",
    title: "Explain code",
    description: "Understand code line by line.",
    prompt:
      "Explain my code line by line, including how it works and what each part does.",
  },
  {
    icon: "⚒",
    title: "Debug errors",
    description: "Investigate errors and find fixes.",
    prompt:
      "Review my code for bugs and errors. Explain the problems and provide corrected code.",
  },
  {
    icon: "✧",
    title: "Build a project",
    description: "Plan and create your next project.",
    prompt:
      "Help me plan and build a coding project step by step. Ask me about my requirements if needed.",
  },
];

const quickPrompts = [
  "Explain this code",
  "Find bugs in my code",
  "Improve code readability",
  "Add comments",
];

const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "HTML",
  "CSS",
];

const starterCode: Record<string, string> = {
  JavaScript: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,

  TypeScript: `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,

  Python: `def greet(name):
    return f"Hello, {name}!"

print(greet("World"))`,

  Java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

  "C++": `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!";
    return 0;
}`,

  HTML: `<!DOCTYPE html>
<html>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>`,

  CSS: `body {
  font-family: sans-serif;
  background: #f5f5f5;
  color: #222;
}`,
};

const extensions: Record<string, string> = {
  JavaScript: "js",
  TypeScript: "ts",
  Python: "py",
  Java: "java",
  "C++": "cpp",
  HTML: "html",
  CSS: "css",
};

// ============================================================
// Reusable components
// ============================================================

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500"
    >
      {error}
    </div>
  );
}

function WorkspaceHeading({
  eyebrow,
  title,
  description,
  muted,
}: {
  eyebrow: string;
  title: string;
  description: string;
  muted: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
        {eyebrow}
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>

      <p className={`mt-2 max-w-2xl text-sm leading-7 ${muted}`}>
        {description}
      </p>
    </div>
  );
}

function ActionCard({
  item,
  panel,
  muted,
  accent = "blue",
  onClick,
}: {
  item: WorkspaceAction;
  panel: string;
  muted: string;
  accent?: "blue" | "green" | "violet";
  onClick: () => void;
}) {
  const accentText = {
    blue: "text-blue-500",
    green: "text-emerald-500",
    violet: "text-violet-500",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${panel}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl">{item.icon}</span>
        <span className={`${accentText} transition group-hover:translate-x-1`}>
          →
        </span>
      </div>

      <h3 className="mt-4 font-semibold">{item.title}</h3>

      <p className={`mt-2 text-sm leading-6 ${muted}`}>
        {item.description}
      </p>
    </button>
  );
}

// ============================================================
// Local project analysis panel
// ============================================================

function ProjectAnalysisPanel({ dark }: { dark: boolean }) {
  const [task, setTask] = useState(
    "Analyze this project architecture, explain its main components and API routes, identify potential bugs and security risks, and recommend the highest-priority improvements. Separate observed facts from inferences."
  );

  const [analysis, setAnalysis] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const panel = dark
    ? "border-[#303030] bg-[#111111]"
    : "border-[#E5DED1] bg-[#FFFCF5]";

  const muted = dark ? "text-[#999999]" : "text-[#777267]";

  async function analyzeProject() {
    if (!task.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnalysis("");
    setModel("");

    try {
      const response = await fetch("/api/coder/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "analyze",
          task: task.trim(),
        }),
      });

      const result = (await response.json()) as AnalysisResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || result.message || "Project analysis failed."
        );
      }

      setAnalysis(result.analysis ?? "");
      setModel(result.model ?? "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the project. Check that your local AI server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`mt-8 rounded-2xl border p-5 sm:p-7 ${panel}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
            AI project assistant
          </div>

          <h2 className="text-xl font-bold">Analyze My Project</h2>

          <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>
            Ask your local coding agent to inspect the project context and
            explain its architecture, routes, possible issues, and improvements.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-500">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          Read-only analysis
        </div>
      </div>

      <label
        htmlFor="project-analysis-task"
        className="mt-6 block text-sm font-semibold"
      >
        What should the AI analyze?
      </label>

      <textarea
        id="project-analysis-task"
        value={task}
        onChange={(event) => setTask(event.target.value)}
        rows={4}
        placeholder="Describe what you want the AI to investigate..."
        className={`mt-3 w-full resize-y rounded-xl border p-4 text-sm leading-6 outline-none transition focus:border-violet-500 ${
          dark
            ? "border-[#303030] bg-black text-white placeholder:text-[#777777]"
            : "border-[#E5DED1] bg-white text-[#292720] placeholder:text-[#999184]"
        }`}
      />

      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className={`text-xs leading-5 ${muted}`}>
          Uses the files selected by the existing project context helper. It
          does not apply proposed changes.
        </p>

        <button
          type="button"
          onClick={analyzeProject}
          disabled={loading || !task.trim()}
          className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing project..." : "Analyze Project"}
        </button>
      </div>

      {loading && (
        <div
          className={`mt-5 rounded-xl border p-4 text-sm ${panel} ${muted}`}
          role="status"
          aria-live="polite"
        >
          Your local AI is analyzing the available project context. This may
          take a little while.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-6">
          <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${muted}`}>
            <h3 className="font-semibold">Analysis report</h3>

            {model && (
              <span className="text-xs">Model: {model}</span>
            )}
          </div>

          <pre
            className={`max-h-[700px] overflow-auto whitespace-pre-wrap break-words rounded-xl border p-5 font-sans text-sm leading-7 ${
              dark
                ? "border-[#303030] bg-black text-[#E5E5E5]"
                : "border-[#E5DED1] bg-white text-[#292720]"
            }`}
          >
            {analysis}
          </pre>

          <button
            type="button"
            onClick={() => {
              setAnalysis("");
              setModel("");
              setError("");
            }}
            className={`mt-3 rounded-lg border px-4 py-2 text-xs font-medium transition ${
              dark
                ? "border-[#303030] hover:bg-[#222222]"
                : "border-[#E5DED1] hover:bg-[#F2EDE3]"
            }`}
          >
            Clear report
          </button>
        </div>
      )}
    </section>
  );
}

// ============================================================
// Main workspace
// ============================================================

export default function WorkspaceHome({
  activeTool,
  dark,
  documentName,
  error,
  onOpenChat,
}: WorkspaceHomeProps) {
  const [language, setLanguage] = useState("JavaScript");
  const [code, setCode] = useState(starterCode.JavaScript);

  const isCA = activeTool === "Business & CA";
  const isCoding = activeTool === "Coding";
  const isDocuments = activeTool === "Documents";

  const pageText = dark ? "text-[#F5F5F5]" : "text-[#292720]";
  const muted = dark ? "text-[#999999]" : "text-[#777267]";

  const panel = dark
    ? "border-[#303030] bg-[#111111]"
    : "border-[#E5DED1] bg-[#FFFCF5]";

  const border = dark ? "border-[#303030]" : "border-[#E5DED1]";

  const subtle = dark
    ? "bg-[#191919] hover:bg-[#222222]"
    : "bg-[#F2EDE3] hover:bg-[#EAE4D9]";

  const mainClass = `mx-auto w-full px-4 py-7 sm:px-8 sm:py-10 ${pageText}`;

  function changeLanguage(nextLanguage: string) {
    setLanguage(nextLanguage);
    setCode(starterCode[nextLanguage] ?? "");
  }

  function askAboutCode(prompt: string) {
    const fullPrompt = `${prompt}

Language: ${language}

My code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\``;

    onOpenChat(fullPrompt);
  }

  // ==========================================================
  // Project file operations state (Coding workspace)
  // ==========================================================

  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [commandOutput, setCommandOutput] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{
    path: string;
    content: string;
  } | null>(null);

  async function listProjectFiles(directory = ".") {
    try {
      const response = await fetch("/api/coder/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", path: directory }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setProjectFiles(data.entries);
      }
    } catch (error) {
      console.error("Failed to list project files:", error);
    }
  }

  async function readProjectFile(filePath: string) {
    setFileLoading(true);
    try {
      const response = await fetch("/api/coder/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", path: filePath }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to read file.");
      }

      const data = await response.json();
      setFileContent(data.content ?? "");
      setSelectedFile(filePath);
    } catch (error) {
      console.error("Failed to read project file:", error);
    } finally {
      setFileLoading(false);
    }
  }

  async function writeProjectFile(
    filePath: string,
    content: string,
    force = false
  ) {
    try {
      const response = await fetch("/api/coder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content, confirm: force }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409 && errorData.requiresConfirm) {
          setConfirmOverwrite({ path: filePath, content });
          return;
        }

        throw new Error(errorData.error || "Failed to write file.");
      }

      const data = await response.json();
      setFileContent(content);
      setSelectedFile(filePath);
      setConfirmOverwrite(null);

      void listProjectFiles();

      return data;
    } catch (error) {
      console.error("Failed to write project file:", error);
      throw error;
    }
  }

  function confirmOverwriteWrite() {
    if (!confirmOverwrite) return;
    void writeProjectFile(
      confirmOverwrite.path,
      confirmOverwrite.content,
      true
    );
  }

  function cancelOverwrite() {
    setConfirmOverwrite(null);
  }

  async function runProjectCommand(
    command: string,
    args: string[] = [],
    confirm = false
  ) {
    setCommandLoading(true);
    setCommandOutput("");
    try {
      const response = await fetch("/api/coder/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, args, confirm }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409 && errorData.requiresConfirm) {
          setCommandOutput(
            `Confirmation required to run: ${command} ${args.join(" ")}\n\nThis command may modify project dependencies. Please confirm to proceed.`
          );
          return;
        }

        throw new Error(errorData.error || "Command failed.");
      }

      const data = await response.json();
      setCommandOutput(data.output || "Command completed with no output.");
    } catch (error) {
      setCommandOutput(
        error instanceof Error
          ? error.message
          : "Command execution failed."
      );
    } finally {
      setCommandLoading(false);
    }
  }

  // ==========================================================
  // Documents workspace
  // ==========================================================

  if (isDocuments) {
    return (
      <main className={`${mainClass} max-w-6xl`}>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <WorkspaceHeading
            eyebrow="Workspace / Documents"
            title="Your documents"
            description="Keep your files organized and use PartnerAI to understand, summarize and ask questions about your documents."
            muted={muted}
          />

          <button
            type="button"
            onClick={() =>
              onOpenChat(
                "I want to discuss a document. Help me upload or analyze my file."
              )
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <span>✦</span>
            Ask about a document
          </button>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`rounded-2xl border p-5 ${panel}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${muted}`}>Current document</span>
              <span className="text-xl">📄</span>
            </div>

            <p className="mt-4 truncate text-lg font-semibold">
              {documentName || "No document selected"}
            </p>

            <p className={`mt-1 text-xs ${muted}`}>
              {documentName
                ? "Document attached"
                : "Attach a file in chat to get started"}
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${panel}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${muted}`}>Document tools</span>
              <span className="text-xl">🛠️</span>
            </div>

            <p className="mt-4 text-lg font-semibold">AI-powered</p>
            <p className={`mt-1 text-xs ${muted}`}>
              Summaries, explanations and answers
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${panel}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${muted}`}>Supported workflow</span>
              <span className="text-xl">📑</span>
            </div>

            <p className="mt-4 text-lg font-semibold">Study & work</p>
            <p className={`mt-1 text-xs ${muted}`}>
              Notes, reports, study material and files
            </p>
          </div>
        </section>

        <section className={`mt-8 overflow-hidden rounded-2xl border ${panel}`}>
          <div className={`border-b px-5 py-4 sm:px-7 ${border}`}>
            <h2 className="font-semibold">Get started with a document</h2>
            <p className={`mt-1 text-sm ${muted}`}>
              Start a conversation with your file.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div
              className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center sm:p-12 ${
                dark
                  ? "border-[#3A3A3A] bg-[#0B0B0B]"
                  : "border-[#D9D1C3] bg-[#FAF7F0]"
              }`}
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${subtle}`}
              >
                📂
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                {documentName
                  ? "Continue with your document"
                  : "Ready to analyze a file?"}
              </h3>

              <p className={`mt-2 max-w-md text-sm leading-6 ${muted}`}>
                Open a chat and use the attachment button to add your document.
                Then ask questions, request summaries or explore specific
                sections.
              </p>

              <button
                type="button"
                onClick={() =>
                  onOpenChat(
                    documentName
                      ? `Help me analyze my document: ${documentName}`
                      : "I want to attach a document and ask questions about it."
                  )
                }
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {documentName
                  ? "Continue in chat →"
                  : "Open chat to attach a file →"}
              </button>

              <p className={`mt-4 text-xs ${muted}`}>
                File upload is handled by the existing chat attachment workflow.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              What would you like to do?
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>
              Choose a task to begin working with your document.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentActions.map((item) => (
              <ActionCard
                key={item.title}
                item={item}
                panel={panel}
                muted={muted}
                onClick={() => onOpenChat(item.prompt)}
              />
            ))}
          </div>
        </section>

        <ErrorMessage error={error} />
      </main>
    );
  }

  // ==========================================================
  // Business & CA workspace
  // ==========================================================

  if (isCA) {
    const quickTools = [
      {
        icon: "🧮",
        label: "Solve a calculation",
        prompt:
          "Help me solve an accounting or finance calculation step by step. Explain each formula and calculation.",
      },
      {
        icon: "📒",
        label: "Practice journal entries",
        prompt:
          "Give me accounting journal entry practice questions one at a time. Check my answers and explain mistakes.",
      },
      {
        icon: "📝",
        label: "Take an MCQ practice session",
        prompt:
          "Start a CA multiple-choice practice session. Ask one question at a time and explain the correct answer after my response.",
      },
    ];

    return (
      <main className={`${mainClass} max-w-6xl`}>
        <section
          className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 ${panel}`}
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                <span>₹</span>
                CA & Finance Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your CA Expert
              </h1>

              <p className={`mt-3 max-w-xl text-sm leading-7 sm:text-base ${muted}`}>
                Learn accounting, prepare for CA exams, understand taxation and
                work through financial concepts with your AI study partner.
              </p>

              <button
                type="button"
                onClick={() =>
                  onOpenChat(
                    "Act as my Chartered Accountancy study assistant. Help me with Indian accounting, GST, Income Tax, company law or CA exam preparation. Ask what topic I need help with."
                  )
                }
                className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ask a CA question →
              </button>
            </div>

            <div className="flex h-28 w-28 shrink-0 items-center justify-center self-center rounded-3xl bg-emerald-500/10 text-5xl text-emerald-500 md:h-36 md:w-36">
              ₹
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold">Study & practice</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Select a subject to explore.
              </p>
            </div>

            <span className={`text-xs ${muted}`}>6 learning areas</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {caTopics.map((topic, index) => (
              <button
                type="button"
                key={topic.title}
                onClick={() => onOpenChat(topic.prompt)}
                className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:shadow-lg ${panel}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">
                    {topic.icon}
                  </div>

                  <span className={`text-xs ${muted}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-5 font-semibold">{topic.title}</h3>

                <p className={`mt-2 min-h-[48px] text-sm leading-6 ${muted}`}>
                  {topic.description}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-500">
                  Explore topic
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={`mt-9 rounded-2xl border p-5 sm:p-7 ${panel}`}>
          <h2 className="text-lg font-bold">Quick tools</h2>
          <p className={`mt-1 text-sm ${muted}`}>
            Start with a practical accounting or exam task.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickTools.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => onOpenChat(item.prompt)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition ${border} ${subtle}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-blue-500">→</span>
              </button>
            ))}
          </div>
        </section>

        <p className={`mx-auto mt-8 max-w-2xl text-center text-xs leading-6 ${muted}`}>
          AI-generated answers may contain errors. Verify tax calculations,
          statutory provisions, amendments and professional advice against
          current official sources.
        </p>

        <ErrorMessage error={error} />
      </main>
    );
  }

  // ==========================================================
  // Coding workspace
  // ==========================================================

  if (isCoding) {
    return (
      <main className={`${mainClass} max-w-7xl`}>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <WorkspaceHeading
            eyebrow="Workspace / Development"
            title="Code Expert"
            description="Write code, understand errors, explore programming concepts and get help building your projects."
            muted={muted}
          />

          <button
            type="button"
            onClick={() => askAboutCode("Help me with the following code.")}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <span>✦</span>
            Ask Code Expert
          </button>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {codingActions.map((item) => (
            <ActionCard
              key={item.title}
              item={item}
              panel={panel}
              muted={muted}
              accent="violet"
              onClick={() => askAboutCode(item.prompt)}
            />
          ))}
        </section>

        {/* Code editor */}
        <section className={`mt-8 overflow-hidden rounded-2xl border ${border}`}>
          <div
            className={`flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center ${panel} ${border}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 font-mono text-sm font-bold text-violet-500">
                {"</>"}
              </div>

              <div>
                <h2 className="text-sm font-semibold">Code Playground</h2>
                <p className={`mt-0.5 text-xs ${muted}`}>
                  Edit a sample and ask AI for help.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="code-language" className={`text-xs ${muted}`}>
                Language
              </label>

              <select
                id="code-language"
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm outline-none ${panel} ${border}`}
              >
                {languages.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCode(starterCode[language] ?? "")}
                className={`rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle}`}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] ${
              dark ? "bg-[#090909]" : "bg-[#F7F5F0]"
            }`}
          >
            <div className="min-w-0">
              <div className={`flex h-10 items-center gap-2 border-b px-4 ${border}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                <span className={`ml-3 text-xs ${muted}`}>
                  main.{extensions[language] ?? "txt"}
                </span>
              </div>

              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                aria-label="Code editor"
                className={`min-h-[300px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-7 outline-none sm:min-h-[380px] ${
                  dark ? "text-[#D4D4D4]" : "text-[#292720]"
                }`}
              />

              <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${border}`}>
                <span className={`text-xs ${muted}`}>
                  {language} · {code.split("\n").length} lines
                </span>

                <button
                  type="button"
                  onClick={() =>
                    askAboutCode("Review and help me improve this code.")
                  }
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  Ask AI about this code →
                </button>
              </div>
            </div>

            <aside className={`border-t p-5 lg:border-l lg:border-t-0 ${border}`}>
              <h3 className="text-sm font-semibold">Developer assistant</h3>

              <p className={`mt-2 text-sm leading-6 ${muted}`}>
                Get explanations, corrections or improvements for the code
                you&apos;re writing.
              </p>

              <div className={`mt-5 rounded-xl border p-4 ${panel}`}>
                <div className="text-xs font-semibold text-violet-500">
                  QUICK PROMPTS
                </div>

                <div className="mt-3 space-y-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      onClick={() => askAboutCode(prompt)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-xs transition ${subtle}`}
                    >
                      {prompt}
                      <span className="text-violet-500">→</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`mt-4 rounded-xl border p-4 ${panel}`}>
                <div className={`text-xs font-medium ${muted}`}>
                  CURRENT LANGUAGE
                </div>

                <div className="mt-2 font-semibold">{language}</div>

                <p className={`mt-1 text-xs leading-5 ${muted}`}>
                  Use the language selector above to change the sample.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* Project file browser */}
        <section className={`mt-8 overflow-hidden rounded-2xl border ${border}`}>
          <div
            className={`flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center ${panel} ${border}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 font-mono text-sm font-bold text-violet-500">
                📁
              </div>
              <div>
                <h2 className="text-sm font-semibold">Project Files</h2>
                <p className={`mt-0.5 text-xs ${muted}`}>
                  Browse and edit files in this PartnerAI project.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void listProjectFiles()}
              disabled={fileLoading}
              className={`rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle}`}
            >
              {fileLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div className="p-4">
            {projectFiles.length === 0 && (
              <p className={`text-xs ${muted}`}>
                Click "Refresh" to load project files.
              </p>
            )}

            <div className="mt-3 max-h-64 overflow-auto rounded-lg border ${border} ${panel}">
              <ul className="divide-y ${border}">
                {projectFiles.map((file) => (
                  <li key={file}>
                    <button
                      type="button"
                      onClick={() => {
                        if (file.endsWith("/")) {
                          void listProjectFiles(file);
                        } else {
                          void readProjectFile(file);
                        }
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition ${
                        selectedFile === file
                          ? "bg-violet-500/10 text-violet-600"
                          : subtle
                      }`}
                    >
                      {file.endsWith("/") ? "📂" : "📄"}
                      <span className="truncate">{file}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* File editor */}
        {(selectedFile || fileContent) && (
          <section className={`mt-8 overflow-hidden rounded-2xl border ${border}`}>
            <div
              className={`flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center ${panel} ${border}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 font-mono text-sm font-bold text-violet-500">
                  ✎
                </div>
                <div>
                  <h2 className="text-sm font-semibold">
                    {selectedFile ?? "Untitled"}
                  </h2>
                  <p className={`mt-0.5 text-xs ${muted}`}>
                    Edit project file and save changes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileContent("");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle}`}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmOverwrite) {
                      cancelOverwrite();
                    } else {
                      void writeProjectFile(selectedFile ?? "", fileContent);
                    }
                  }}
                  disabled={!fileContent}
                  className={`rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 ${
                    !fileContent ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {confirmOverwrite ? "Confirm overwrite" : "Save file"}
                </button>
              </div>
            </div>

            <div
              className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] ${dark ? "bg-[#090909]" : "bg-[#F7F5F0]"}`}
            >
              <div className="min-w-0">
                <div className={`flex h-10 items-center gap-2 border-b px-4 ${border}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                  <span className={`ml-3 text-xs ${muted}`}>
                    {selectedFile?.split("/").pop() ?? "file"}
                  </span>
                </div>

                <textarea
                  value={fileContent}
                  onChange={(event) => setFileContent(event.target.value)}
                  spellCheck={false}
                  aria-label="File editor"
                  className={`min-h-[300px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-7 outline-none sm:min-h-[420px] ${dark ? "text-[#D4D4D4]" : "text-[#292720]"}`}
                />
              </div>

              <aside className={`border-t p-5 lg:border-l lg:border-t-0 ${border}`}>
                <h3 className="text-sm font-semibold">File actions</h3>

                <p className={`mt-2 text-sm leading-6 ${muted}`}>
                  Changes are applied directly to the project file.
                </p>

                {confirmOverwrite && (
                  <div className={`mt-5 rounded-xl border p-4 bg-[#FEF3C7] dark:bg-[#92400E]/10 border-[#FCD34D] dark:border-[#92400E]/50`}>
                    <p className="text-sm text-[#92400E] dark:text-[#FCD34D]">
                      ⚠️ File already exists. Confirm to overwrite.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={confirmOverwriteWrite}
                        className="flex-1 rounded-lg bg-[#92400E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#78350F]"
                      >
                        Yes, overwrite
                      </button>
                      <button
                        type="button"
                        onClick={cancelOverwrite}
                        className={`flex-1 rounded-lg border px-4 py-2 text-xs font-medium transition ${border} ${subtle}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!confirmOverwrite && (
                  <div className="mt-5 space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        askAboutCode(`Review this file: ${selectedFile}`)
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-xs transition ${subtle}`}
                    >
                      Ask AI about this file
                      <span className="text-violet-500">→</span>
                    </button>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* Command runner */}
        <section className={`mt-8 overflow-hidden rounded-2xl border ${border}`}>
          <div
            className={`flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center ${panel} ${border}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 font-mono text-sm font-bold text-violet-500">
                $_{" "}
              </div>
              <div>
                <h2 className="text-sm font-semibold">Terminal commands</h2>
                <p className={`mt-0.5 text-xs ${muted}`}>
                  Run verification commands on this project.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => void runProjectCommand("npm", ["run", "typecheck"])}
                disabled={commandLoading}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle} ${
                  commandLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span>🔍</span>
                <span>Typecheck</span>
              </button>
              <button
                type="button"
                onClick={() => void runProjectCommand("npm", ["run", "lint"])}
                disabled={commandLoading}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle} ${
                  commandLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span>🧹</span>
                <span>Lint</span>
              </button>
              <button
                type="button"
                onClick={() => void runProjectCommand("npm", ["run", "build"])}
                disabled={commandLoading}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle} ${
                  commandLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span>🏗️</span>
                <span>Build</span>
              </button>
              <button
                type="button"
                onClick={() => void runProjectCommand("git", ["status"])}
                disabled={commandLoading}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${border} ${subtle} ${
                  commandLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span>🌿</span>
                <span>Git status</span>
              </button>
            </div>

            {commandOutput && (
              <div className="mt-4 rounded-xl border p-4 font-mono text-xs leading-6 overflow-auto max-h-64">
                <div className="flex justify-between mb-2">
                  <span className={`font-semibold ${muted}`}>Output</span>
                  {commandLoading && <span>Running…</span>}
                </div>
                <pre className={`whitespace-pre-wrap break-words text-sm ${
                  dark ? "text-[#D4D4D4] bg-black" : "text-[#292720] bg-[#F7F5F0]"
                } p-3 rounded-lg border ${border}`}>
                  {commandOutput}
                </pre>
              </div>
            )}
          </div>
        </section>

        <p className={`mt-5 text-center text-xs ${muted}`}>
          This is an editing and AI-assistance interface. Code execution is not
          enabled in this playground.
        </p>

        {/* This panel belongs only to the Coding workspace. */}
        <ProjectAnalysisPanel dark={dark} />

        <ErrorMessage error={error} />
      </main>
    );
  }

  // ==========================================================
  // Default workspace
  // ==========================================================

  const generalActions: WorkspaceAction[] = [
    {
      icon: "✍️",
      title: "Writing & summaries",
      description: "Write, rewrite or summarize content.",
      prompt: "Help me write or summarize something. Ask me what I need.",
    },
    {
      icon: "💡",
      title: "Ideas & brainstorming",
      description: "Explore ideas for a project or goal.",
      prompt: "Help me brainstorm creative ideas for a project.",
    },
    {
      icon: "🔎",
      title: "Research assistance",
      description: "Explore a topic and organize information.",
      prompt: "Help me research a topic and organize the information.",
    },
  ];

  return (
    <main
      className={`${mainClass} flex max-w-4xl flex-col items-center py-12 sm:py-16`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl ${panel}`}
      >
        ✦
      </div>

      <h1 className="mt-6 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        What can I help you with?
      </h1>

      <p className={`mt-4 max-w-xl text-center text-sm leading-7 sm:text-base ${muted}`}>
        Your AI partner for questions, ideas, writing and everyday tasks.
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {generalActions.map((item) => (
          <ActionCard
            key={item.title}
            item={item}
            panel={panel}
            muted={muted}
            onClick={() => onOpenChat(item.prompt)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenChat()}
        className="mt-8 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Start chatting →
      </button>

      <ErrorMessage error={error} />
    </main>
  );
}