
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    return NextResponse.json(
      { error: "Name must be a string" },
      { status: 400 }
    );
  }

  const name = body.name.trim();

  if (name.length < 2 || name.length > 50) {
    return NextResponse.json(
      { error: "Name must be between 2 and 50 characters" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    greeting: `Hello, ${name}!`,
  });
}