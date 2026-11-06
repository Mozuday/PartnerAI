import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

const ALLOWED_CHECKS = [
  "typecheck",
  "lint",
  "build",
] as const;

export type VerificationCheck =
  (typeof ALLOWED_CHECKS)[number];

type VerificationResult = {
  success: boolean;
  check: VerificationCheck;
  exitCode: number | null;
  output: string;
  durationMs: number;
};

const MAX_OUTPUT_LENGTH = 30_000;
const TIMEOUT_MS = 120_000;

export async function runProjectCheck(
  check: VerificationCheck
): Promise<VerificationResult> {
  if (
    !ALLOWED_CHECKS.includes(check)
  ) {
    throw new Error(
      "This verification command is not allowed."
    );
  }

  const packageJsonPath = path.join(
    PROJECT_ROOT,
    "package.json"
  );

  const packageJsonText =
    await fs.readFile(
      packageJsonPath,
      "utf8"
    );

  const packageJson = JSON.parse(
    packageJsonText
  ) as {
    scripts?: Record<string, string>;
  };

  const scripts =
    packageJson.scripts ?? {};

  let npmScript: string;

  if (check === "typecheck") {
    if (!scripts.typecheck) {
      return {
        success: false,
        check,
        exitCode: null,
        output:
          'The "typecheck" script is missing from package.json. Add "typecheck": "tsc --noEmit" to scripts, provided TypeScript is installed.',
        durationMs: 0,
      };
    }

    npmScript = "typecheck";
  } else {
    if (!scripts[check]) {
      return {
        success: false,
        check,
        exitCode: null,
        output:
          `The "${check}" script is missing from package.json.`,
        durationMs: 0,
      };
    }

    npmScript = check;
  }

  const startedAt = Date.now();

  return new Promise<VerificationResult>(
    (resolve, reject) => {
      const isWindows =
        process.platform === "win32";

      const child = spawn(
        isWindows ? "npm.cmd" : "npm",
        ["run", npmScript],
        {
          cwd: PROJECT_ROOT,
          shell: isWindows,
          windowsHide: true,
          env: {
            ...process.env,
            CI: "1",
          },
        }
      );

      let output = "";
      let settled = false;

      const appendOutput = (
        chunk: Buffer | string
      ) => {
        output += chunk.toString();

        if (
          output.length >
          MAX_OUTPUT_LENGTH
        ) {
          output =
            output.slice(
              -MAX_OUTPUT_LENGTH
            );
        }
      };

      const timeout = setTimeout(
        () => {
          appendOutput(
            "\n\nVerification timed out after 120 seconds."
          );

          child.kill();

          finish(null, true);
        },
        TIMEOUT_MS
      );

      const finish = (
        exitCode: number | null,
        timedOut = false
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);

        resolve({
          success:
            !timedOut &&
            exitCode === 0,
          check,
          exitCode,
          output,
          durationMs:
            Date.now() - startedAt,
        });
      };

      child.stdout.on(
        "data",
        appendOutput
      );

      child.stderr.on(
        "data",
        appendOutput
      );

      child.on("error", (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);

        reject(
          new Error(
            `Could not start npm: ${error.message}`
          )
        );
      });

      child.on("close", (code) => {
        finish(code);
      });
    }
  );
}