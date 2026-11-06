import { NextResponse } from "next/server";

import { getCoderProjectContext } from "@/lib/coding/context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await getCoderProjectContext();

    return NextResponse.json({
      success: true,
      context,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to build Coder project context.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}