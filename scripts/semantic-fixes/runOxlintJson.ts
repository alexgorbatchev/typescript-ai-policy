import { closeSync, openSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import type { IOxlintDiagnostic } from "./types.ts";

type IRunOxlintJsonOptions = {
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  targetDirectoryPath: string;
};

type IOxlintProcessCompletion = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

type IOxlintProcessResult = IOxlintProcessCompletion & {
  stderr: string;
  stdout: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOxlintDiagnostic(value: unknown): value is IOxlintDiagnostic {
  if (!isRecord(value)) {
    return false;
  }

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
  if (!normalizedRuleCodeMatch) {
    return ruleCode;
  }

  const [, pluginName, localRuleName] = normalizedRuleCodeMatch;
  return `${pluginName}/${localRuleName}`;
}

function readDiagnostics(report: unknown): readonly IOxlintDiagnostic[] {
  if (!isRecord(report) || !Array.isArray(report.diagnostics)) {
    throw new Error(`Unexpected Oxlint JSON output: ${JSON.stringify(report)}`);
  }

  const diagnostics = report.diagnostics.filter(isOxlintDiagnostic);
  if (diagnostics.length !== report.diagnostics.length) {
    throw new Error(`Unexpected Oxlint diagnostic payload: ${JSON.stringify(report)}`);
  }

  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    code: readNormalizedRuleCode(diagnostic.code),
  }));
}

async function runOxlintProcess(options: IRunOxlintJsonOptions): Promise<IOxlintProcessResult> {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "semantic-fixes-oxlint-"));
  const stdoutPath = join(tempDirectoryPath, "oxlint-report.json");
  const stdoutFileDescriptor = openSync(stdoutPath, "w");

  try {
    let childProcess: ReturnType<typeof spawn>;

    try {
      childProcess = spawn(
        options.oxlintExecutablePath,
        ["--config", options.oxlintConfigPath, "--disable-nested-config", "--format", "json", "."],
        {
          cwd: options.targetDirectoryPath,
          stdio: ["ignore", stdoutFileDescriptor, "pipe"],
        },
      );
    } finally {
      closeSync(stdoutFileDescriptor);
    }

    const stderrChunks: string[] = [];
    const stderrStream = childProcess.stderr;
    if (!stderrStream) {
      throw new Error("Oxlint stderr stream is unavailable.");
    }

    stderrStream.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString("utf8"));
    });

    const processCompletion = await new Promise<IOxlintProcessCompletion>((resolve, reject) => {
      childProcess.once("error", (error: Error) => {
        reject(error);
      });
      childProcess.once("close", (exitCode: number | null, signal: NodeJS.Signals | null) => {
        resolve({ exitCode, signal });
      });
    });

    const stdout = await readFile(stdoutPath, "utf8");

    return {
      exitCode: processCompletion.exitCode,
      signal: processCompletion.signal,
      stderr: stderrChunks.join("").trim(),
      stdout,
    };
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
}

export async function runOxlintJson(options: IRunOxlintJsonOptions): Promise<readonly IOxlintDiagnostic[]> {
  const runResult = await runOxlintProcess(options);
  const stdout = runResult.stdout.trim();
  if (stdout.length === 0) {
    throw new Error(`Oxlint returned no JSON output.\n\nStderr:\n${runResult.stderr}`);
  }

  const parsedOutput: unknown = JSON.parse(stdout);
  const diagnostics = readDiagnostics(parsedOutput);

  if (runResult.exitCode !== 0 && runResult.exitCode !== 1) {
    const signalSuffix = runResult.signal ? `, signal=${runResult.signal}` : "";
    throw new Error(
      `Oxlint failed with exit code ${String(runResult.exitCode)}${signalSuffix}.\n\nStderr:\n${runResult.stderr}`,
    );
  }

  return diagnostics;
}
