import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

const PROJECT_ROOT = process.cwd();

const MAX_OUTPUT_LENGTH = 50_000;
const TIMEOUT_MS = 120_000;

// Allowed base commands.
const ALLOWED_COMMANDS = new Set([
  "npm",
  "npx",
  "node",
  "tsc",
  "git",
]);

// Destructive commands that are always blocked.
const BLOCKED_COMMANDS = new Set([
  "rm", "del", "rmdir", "rd", "format", "fdisk", "mkfs",
  "shutdown", "reboot", "halt", "poweroff", "init", "dd",
]);

// Read-only git subcommands allowed.
const ALLOWED_GIT_COMMANDS = new Set([
  "status", "log", "diff", "branch", "show", "rev-parse", "ls-files",
]);

// npm subcommands allowed. "install" requires confirmation.
const ALLOWED_NPM_COMMANDS = new Set([
  "run", "install", "ci", "test", "build", "lint", "typecheck",
]);

type RequestBody = {
  command?: string;
  args?: string[];
  confirm?: boolean;
};

function isDestructiveCommand(cmd: string, args: string[]): boolean {
  const fullCommand = [cmd, ...args].join(" ");

  if (BLOCKED_COMMANDS.has(cmd.toLowerCase())) {
    return true;
  }

  // Block rm -rf patterns.
  if (cmd.toLowerCase() === "rm" && args.includes("-rf")) {
    return true;
  }

  // Block shell operators and redirects.
  if (/[;&|`$()]/.test(fullCommand)) {
    return true;
  }

  if (fullCommand.includes(">") || fullCommand.includes("<")) {
    return true;
  }

  return false;
}

function validateCommand(
  cmd: string,
  args: string[]
): { valid: boolean; error?: string; requiresConfirm?: boolean } {
  if (!cmd || typeof cmd !== "string") {
    return { valid: false, error: "Command is required." };
  }

  const baseCmd = cmd.toLowerCase();

  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    return { valid: false, error: `Command "${cmd}" is not allowed.` };
  }

  if (isDestructiveCommand(cmd, args)) {
    return { valid: false, error: "Destructive commands are not allowed." };
  }

  // Git: only allow read-only subcommands.
  if (baseCmd === "git") {
    if (!args || args.length === 0) {
      return { valid: false, error: "A git subcommand is required." };
    }
    if (!ALLOWED_GIT_COMMANDS.has(args[0].toLowerCase())) {
      return {
        valid: false,
        error: `Git subcommand "${args[0]}" is not allowed. Only read-only git operations are permitted.`,
      };
    }
    return { valid: true };
  }

  // npm: only allow specific subcommands; "install" requires confirmation.
  if (baseCmd === "npm") {
    if (!args || args.length === 0) {
      return { valid: false, error: "An npm subcommand is required." };
    }
    const npmSubcmd = args[0].toLowerCase();
    if (!ALLOWED_NPM_COMMANDS.has(npmSubcmd)) {
      return { valid: false, error: `npm ${npmSubcmd} is not allowed.` };
    }
    if (npmSubcmd === "install") {
      return { valid: true, requiresConfirm: true };
    }
    return { valid: true };
  }

  return { valid: true };
}

function runCommand(
  cmd: string,
  args: string[]
): Promise<{
  success: boolean;
  exitCode: number | null;
  output: string;
  durationMs: number;
}> {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? `${cmd}.cmd` : cmd;

  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: PROJECT_ROOT,
      shell: isWindows,
      windowsHide: true,
      env: { ...process.env, CI: "1" },
    });

    let output = "";
    let settled = false;

    const appendOutput = (chunk: Buffer | string) => {
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_LENGTH) {
        output = output.slice(-MAX_OUTPUT_LENGTH);
      }
    };

    const timeout = setTimeout(() => {
      appendOutput("\n\nCommand timed out after 120 seconds.");
      child.kill();
      finish(null, true);
    }, TIMEOUT_MS);

    const finish = (exitCode: number | null, timedOut = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        success: !timedOut && exitCode === 0,
        exitCode,
        output,
        durationMs: Date.now() - startedAt,
      });
    };

    child.stdout.on("data", appendOutput);
    child.stderr.on("data", appendOutput);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        success: false,
        exitCode: null,
        output: `Could not start ${cmd}: ${error.message}`,
        durationMs: Date.now() - startedAt,
      });
    });

    child.on("close", (code) => {
      finish(code);
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const { command, args = [], confirm = false } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { success: false, error: "Command is required." },
        { status: 400 }
      );
    }

    const validation = validateCommand(command, args);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Require confirmation for potentially dependency-modifying commands.
    if (validation.requiresConfirm && !confirm) {
      return NextResponse.json(
        {
          success: false,
          error: "This command may modify project dependencies. Confirmation required.",
          requiresConfirm: true,
        },
        { status: 409 }
      );
    }

    const result = await runCommand(command, args);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Command execution failed.";

    console.error("Coder command error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}