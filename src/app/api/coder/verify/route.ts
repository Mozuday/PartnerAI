import { NextResponse } from "next/server";

import {
  runProjectCheck,
  type VerificationCheck,
} from "@/lib/coding/commands";

export const runtime = "nodejs";

const ALLOWED_CHECKS: VerificationCheck[] = [
  "typecheck",
  "lint",
  "build",
];

type RequestBody = {
  check?: string;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as RequestBody;

    if (
      typeof body.check !== "string" ||
      !ALLOWED_CHECKS.includes(
        body.check as VerificationCheck
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid check. Use "typecheck", "lint", or "build".',
        },
        { status: 400 }
      );
    }

    const result = await runProjectCheck(
      body.check as VerificationCheck
    );

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Verification failed unexpectedly.";

    console.error(
      "Coder verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}