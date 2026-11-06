
import {
  listProjectDirectory,
  readProjectFile,
} from "./project";

const MAX_FILE_SIZE = 12_000;
const MAX_FILES = 40;
const MAX_TREE_ENTRIES = 500;
const MAX_TOTAL_CONTEXT = 100_000;

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
]);

const SKIP_FILES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.development.local",
  ".env.production.local",
  "id_rsa",
  "id_ed25519",
]);

const BASE_FILES = [
  "package.json",
  "tsconfig.json",
  "README.md",
];

const UI_FILES = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/globals.css",
];

const API_FILES = [
  "src/app/api/chat/route.ts",
  "src/app/api/coder/agent/route.ts",
  "src/lib/ai/types.ts",
  "src/lib/ai/model-config.ts",
  "src/lib/ai/providers/ollama.ts",
];

const CODING_FILES = [
  "src/lib/coding/context.ts",
  "src/lib/coding/project.ts",
];

type ProjectFile = {
  path: string;
  content: string;
};

function isSecretPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const name = parts.at(-1)?.toLowerCase() ?? "";

  if (parts.some((part) => part.startsWith(".env"))) {
    return true;
  }

  if (SKIP_FILES.has(name)) {
    return true;
  }

  return (
    name.endsWith(".pem") ||
    name.endsWith(".key") ||
    name.endsWith(".p12") ||
    name.endsWith(".pfx") ||
    name.endsWith(".sqlite") ||
    name.endsWith(".db")
  );
}

function isSkippablePath(filePath: string): boolean {
  const parts = filePath.replace(/\\/g, "/").split("/");

  return (
    isSecretPath(filePath) ||
    parts.some((part) => SKIP_DIRECTORIES.has(part))
  );
}

async function safeReadFile(
  filePath: string,
): Promise<string | null> {
  if (isSkippablePath(filePath)) {
    return null;
  }

  try {
    const content = await readProjectFile(filePath);

    if (content.length > MAX_FILE_SIZE) {
      return (
        content.slice(0, MAX_FILE_SIZE) +
        "\n\n[FILE TRUNCATED: per-file context limit reached]\n"
      );
    }

    return content;
  } catch {
    return null;
  }
}

async function collectProjectTree(
  directory = ".",
  depth = 0,
  budget = { entries: 0 },
): Promise<string[]> {
  if (depth > 8 || budget.entries >= MAX_TREE_ENTRIES) {
    return [];
  }

  let entries: string[];

  try {
    entries = await listProjectDirectory(directory);
  } catch {
    return [];
  }

  const results: string[] = [];

  for (const entry of entries) {
    if (budget.entries >= MAX_TREE_ENTRIES) {
      break;
    }

    const relativePath =
      directory === "."
        ? entry
        : `${directory.replace(/\/$/, "")}/${entry}`;

    const isDirectory = entry.endsWith("/");
    const cleanPath = relativePath.replace(/\/$/, "");

    if (isSkippablePath(cleanPath)) {
      continue;
    }

    budget.entries += 1;
    results.push(isDirectory ? `${cleanPath}/` : cleanPath);

    if (isDirectory) {
      const children = await collectProjectTree(
        cleanPath,
        depth + 1,
        budget,
      );

      results.push(...children);
    }
  }

  return results;
}

function selectFiles(task: string, tree: string[]): string[] {
  const query = task.toLowerCase();
  const selected = new Set<string>(BASE_FILES);

  const addExisting = (filePaths: string[]) => {
    for (const filePath of filePaths) {
      if (
        tree.includes(filePath) &&
        !isSkippablePath(filePath)
      ) {
        selected.add(filePath);
      }
    }
  };

  const analysisRequest =
    /\b(explain|analy[sz]e|analysis|overview|architecture|understand|inspect|audit|summari[sz]e)\b/.test(
      query,
    );

  if (analysisRequest) {
    addExisting(
      tree.filter(
        (filePath) =>
          filePath.startsWith("src/app/") &&
          filePath.endsWith("route.ts"),
      ),
    );

    addExisting(
      tree.filter(
        (filePath) =>
          /(^|\/)(features|lib)\//.test(filePath) &&
          /\.(ts|tsx)$/.test(filePath),
      ),
    );

    addExisting(
      tree.filter(
        (filePath) =>
          /(^|\/)(page|layout)\.tsx$/.test(filePath),
      ),
    );
  }

  const mentionsUI =
    /\b(ui|frontend|component|react|jsx|tsx|button|form|modal|navbar|sidebar|page|layout)\b/.test(
      query,
    );

  const mentionsStyling =
    /\b(css|style|styling|tailwind|color|theme|responsive|spacing)\b/.test(
      query,
    );

  const mentionsAPI =
    /\b(api|route handler|endpoint|backend|server|ollama|streaming|request|response|chat route)\b/.test(
      query,
    );

  const mentionsCoding =
    /\b(coder|coding assistant|project context|file reader|project tree|typescript|type error|typecheck|debug|bug|refactor)\b/.test(
      query,
    );

  if (mentionsUI) addExisting(UI_FILES);

  if (mentionsStyling) {
    addExisting(["src/app/globals.css"]);
  }

  if (mentionsAPI) addExisting(API_FILES);

  if (mentionsCoding) addExisting(CODING_FILES);

  return [...selected].filter(
    (filePath) => !isSkippablePath(filePath),
  );
}

export async function getCoderProjectContext(task = "") {
  const projectTree = await collectProjectTree();
  const selectedFiles = selectFiles(task, projectTree);

  const files: ProjectFile[] = [];
  let totalCharacters = 0;

  for (const filePath of selectedFiles.slice(0, MAX_FILES)) {
    const content = await safeReadFile(filePath);

    if (content === null) continue;

    if (totalCharacters + content.length > MAX_TOTAL_CONTEXT) {
      break;
    }

    files.push({ path: filePath, content });
    totalCharacters += content.length;
  }

  return {
    projectTree,
    files,
  };
}
