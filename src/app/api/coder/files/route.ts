import { NextResponse } from "next/server";
import path from "node:path";

import {
  readProjectFile,
  writeProjectFile,
} from "@/lib/coding/files";

export const runtime = "nodejs";

type RequestBody = {
  action?: "read" | "write";
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

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    // --------------------------------------------
    // READ FILE
    // --------------------------------------------

    if (body.action === "read") {
      if (!body.path) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A file path is required.",
          },
          {
            status: 400,
          }
        );
      }

      // Block sensitive files from being read.
      if (isSensitivePath(body.path)) {
        return NextResponse.json(
          {
            success: false,
            error: "Access to this file is not allowed.",
          },
          { status: 403 }
        );
      }

      const content =
        await readProjectFile(
          body.path
        );

      return NextResponse.json({
        success: true,
        action: "read",
        path: body.path,
        content,
      });
    }

    // --------------------------------------------
    // WRITE FILE
    // --------------------------------------------

    if (body.action === "write") {
      if (!body.path) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A file path is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof body.content !==
        "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File content must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      // Block sensitive files from being written.
      if (isSensitivePath(body.path)) {
        return NextResponse.json(
          {
            success: false,
            error: "Access to this file is not allowed.",
          },
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

      await writeProjectFile(
        body.path,
        body.content
      );

      return NextResponse.json({
        success: true,
        action: fileExists ? "overwrite" : "write",
        path: body.path,
        message:
          fileExists
            ? "File overwritten successfully."
            : "File written successfully.",
      });
    }

    // --------------------------------------------
    // INVALID ACTION
    // --------------------------------------------

    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid action. Use "read" or "write".',
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown file operation error.";

    console.error(
      "Coder file operation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}