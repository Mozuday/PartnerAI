import { NextResponse } from "next/server";

import {
  listProjectDirectory,
  readProjectFile,
} from "@/lib/coding/project";

export const runtime = "nodejs";

type RequestBody = {
  action?: "list" | "read";
  path?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (body.action === "list") {
      const entries = await listProjectDirectory(
        body.path ?? "."
      );

      return NextResponse.json({
        success: true,
        action: "list",
        path: body.path ?? ".",
        entries,
      });
    }

    if (body.action === "read") {
      if (!body.path) {
        return NextResponse.json(
          {
            success: false,
            error: "A file path is required.",
          },
          { status: 400 }
        );
      }

      const content = await readProjectFile(
        body.path
      );

      return NextResponse.json({
        success: true,
        action: "read",
        path: body.path,
        content,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid action. Use "list" or "read".',
      },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown project access error.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}