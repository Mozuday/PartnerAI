import { promises as fs } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(process.cwd());

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);

  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function resolveProjectPath(relativePath: string): string {
  if (
    typeof relativePath !== "string" ||
    relativePath.includes("\0") ||
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid project-relative path.");
  }

  const normalizedPath = path.normalize(relativePath);

  if (
    normalizedPath === ".." ||
    normalizedPath.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Access outside the project is not allowed.");
  }

  const resolvedPath = path.resolve(PROJECT_ROOT, normalizedPath);

  if (!isInsideRoot(PROJECT_ROOT, resolvedPath)) {
    throw new Error("Access outside the project is not allowed.");
  }

  return resolvedPath;
}

async function verifyRealPath(filePath: string): Promise<string> {
  const [realRoot, realTarget] = await Promise.all([
    fs.realpath(PROJECT_ROOT),
    fs.realpath(filePath),
  ]);

  if (!isInsideRoot(realRoot, realTarget)) {
    throw new Error("Access outside the project is not allowed.");
  }

  return realTarget;
}

export async function readProjectFile(
  relativePath: string,
): Promise<string> {
  const filePath = resolveProjectPath(relativePath);
  const safePath = await verifyRealPath(filePath);
  const stats = await fs.stat(safePath);

  if (!stats.isFile()) {
    throw new Error(`"${relativePath}" is not a file.`);
  }

  return fs.readFile(safePath, "utf8");
}

export async function listProjectDirectory(
  relativePath = ".",
): Promise<string[]> {
  const directoryPath = resolveProjectPath(relativePath);
  const safePath = await verifyRealPath(directoryPath);
  const stats = await fs.stat(safePath);

  if (!stats.isDirectory()) {
    throw new Error(`"${relativePath}" is not a directory.`);
  }

  const entries = await fs.readdir(safePath, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => !entry.isSymbolicLink())
    .map((entry) =>
      entry.isDirectory() ? `${entry.name}/` : entry.name,
    )
    .sort();
}