import { closeSync, openSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import type { OxlintDiagnostic } from "./types.ts";

type RunOxlintJsonOptions = {
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  targetDirectoryPath: string;
};

type OxlintProcessCompletion = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

type OxlintProcessResult = OxlintProcessCompletion & {
  stderr: string;
  stdout: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOxlintDiagnostic(value: unknown): value is OxlintDiagnostic {
  if (!isRecord(value)) return false;
  return (
    typeof value.code === "string" &&
    typeof value.filename === "string" &&
    Array.isArray(value.labels) &&
    typeof value.message === "string" &&
    typeof value.severity === "string"
  );
}

function readNormalizedRuleCode(ruleCode: string): string {
  const normalizedRuleCodeMatch = /^(@[^()]+)\(([^()]+)\)$/.exec(ruleCode);
  if (!normalizedRuleCodeMatch) return ruleCode;
  const [, pluginName, localRuleName] = normalizedRuleCodeMatch;
  return `${pluginName}/${localRuleName}`;
}

function readDiagnostics(report: unknown): readonly OxlintDiagnostic[] {
  if (!isRecord(report) || !Array.isArray(report.diagnostics)) {
    return [];
  }
  const diagnostics = report.diagnostics.filter(isOxlintDiagnostic);
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    code: readNormalizedRuleCode(diagnostic.code),
  }));
}

async function runOxlintProcess(options: RunOxlintJsonOptions): Promise<OxlintProcessResult> {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "semantic-fixes-oxlint-"));
  const stdoutPath = join(tempDirectoryPath, "oxlint-report.json");
  const stdoutFileDescriptor = openSync(stdoutPath, "w");

  try {
    const childProcess = spawn(
      options.oxlintExecutablePath,
      ["--config", options.oxlintConfigPath, "--disable-nested-config", "--format", "json", "."],
      {
        cwd: options.targetDirectoryPath,
        stdio: ["ignore", stdoutFileDescriptor, "pipe"],
      },
    );
    closeSync(stdoutFileDescriptor);

    const stderrChunks: string[] = [];
    childProcess.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk.toString("utf8")));

    const processCompletion = await new Promise<OxlintProcessCompletion>((resolve) => {
      childProcess.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
    });

    const rawStdout = await readFile(stdoutPath, "utf8");
    let diagnostics: unknown[] = [];
    try {
      const parsed = JSON.parse(rawStdout);
      if (parsed.diagnostics) {
        diagnostics = parsed.diagnostics;
      }
    } catch {
      const lines = rawStdout.split("\n");
      for (let line of lines) {
        line = line.trim();
        if (!line || line === "{" || line === "}") continue;
        if (line.endsWith(",")) line = line.slice(0, -1);
        try {
          const parsed = JSON.parse(line);
          if (parsed.diagnostics) {
            diagnostics.push(...parsed.diagnostics);
          } else if (parsed.message) {
            diagnostics.push(parsed);
          }
        } catch {
          // Ignore parsing errors for individual lines in fallback mode
        }
      }
    }

    return {
      exitCode: processCompletion.exitCode,
      signal: processCompletion.signal,
      stderr: stderrChunks.join("").trim(),
      stdout: JSON.stringify({ diagnostics }),
    };
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
}

export async function runOxlintJson(options: RunOxlintJsonOptions): Promise<readonly OxlintDiagnostic[]> {
  const runResult = await runOxlintProcess(options);
  const parsedOutput: unknown = JSON.parse(runResult.stdout);
  return readDiagnostics(parsedOutput);
}
