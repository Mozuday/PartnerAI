import { NextResponse } from "next/server";

import {
  readProjectFile,
  writeProjectFile,
} from "@/lib/coding/files";

export const runtime = "nodejs";

type RequestBody = {
  path?: string;
  content?: string;
  confirm?: boolean;
};

const SENSITIVE_PATTERNS = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.development.local",
  ".env.production.local",
  "id_rsa",
  "id_ed25519",
];

function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const parts = normalized.split("/");
  const name = parts[parts.length - 1] ?? "";

  if (SENSITIVE_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()))) {
    return true;
  }

  if (SENSITIVE_PATTERNS.includes(name)) {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.path || typeof body.path !== "string") {
      return NextResponse.json(
        { success: false, error: "A file path is required." },
        { status: 400 }
      );
    }

    if (typeof body.content !== "string") {
      return NextResponse.json(
        { success: false, error: "File content must be a string." },
        { status: 400 }
      );
    }

    // Block sensitive files (environment secrets, keys, certificates).
    if (isSensitivePath(body.path)) {
      return NextResponse.json(
        { success: false, error: "Access to this file is not allowed." },
        { status: 403 }
      );
    }

    // Check if the file already exists. Require explicit confirmation to overwrite.
    let fileExists = false;
    try {
      await readProjectFile(body.path);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (fileExists && !body.confirm) {
      return NextResponse.json(
        {
          success: false,
          error: "File already exists. Confirmation required to overwrite.",
          requiresConfirm: true,
          path: body.path,
        },
        { status: 409 }
      );
    }

    await writeProjectFile(body.path, body.content);

    return NextResponse.json({
      success: true,
      action: fileExists ? "overwrite" : "create",
      path: body.path,
      message: fileExists
        ? "File overwritten successfully."
        : "File created successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown apply error.";

    console.error("Coder apply error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}