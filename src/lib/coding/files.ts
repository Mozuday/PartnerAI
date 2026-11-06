import { promises as fs } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

function resolveProjectPath(
  relativePath: string
): string {
  const normalizedPath =
    path.normalize(relativePath);

  if (
    !relativePath ||
    normalizedPath === ".." ||
    normalizedPath.startsWith(
      `..${path.sep}`
    ) ||
    path.isAbsolute(normalizedPath)
  ) {
    throw new Error(
      "Access outside the project is not allowed."
    );
  }

  const resolvedPath = path.resolve(
    PROJECT_ROOT,
    normalizedPath
  );

  const relativeToRoot =
    path.relative(
      PROJECT_ROOT,
      resolvedPath
    );

  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new Error(
      "Access outside the project is not allowed."
    );
  }

  return resolvedPath;
}

export async function readProjectFile(
  relativePath: string
): Promise<string> {
  const filePath =
    resolveProjectPath(relativePath);

  const stats =
    await fs.stat(filePath);

  if (!stats.isFile()) {
    throw new Error(
      `"${relativePath}" is not a file.`
    );
  }

  return fs.readFile(
    filePath,
    "utf8"
  );
}

export async function writeProjectFile(
  relativePath: string,
  content: string
): Promise<void> {
  const filePath =
    resolveProjectPath(relativePath);

  const directoryPath =
    path.dirname(filePath);

  await fs.mkdir(
    directoryPath,
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    filePath,
    content,
    "utf8"
  );
}

export async function listProjectDirectory(
  relativePath = "."
): Promise<string[]> {
  const directoryPath =
    resolveProjectPath(
      relativePath
    );

  const stats =
    await fs.stat(directoryPath);

  if (!stats.isDirectory()) {
    throw new Error(
      `"${relativePath}" is not a directory.`
    );
  }

  const entries =
    await fs.readdir(
      directoryPath,
      {
        withFileTypes: true,
      }
    );

  return entries
    .map((entry) =>
      entry.isDirectory()
        ? `${entry.name}/`
        : entry.name
    )
    .sort();
}