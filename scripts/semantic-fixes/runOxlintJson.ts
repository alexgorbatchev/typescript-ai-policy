import { spawnSync } from "node:child_process";
import type { IOxlintDiagnostic } from "./types.ts";

type IRunOxlintJsonOptions = {
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  targetDirectoryPath: string;
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

export function runOxlintJson(options: IRunOxlintJsonOptions): readonly IOxlintDiagnostic[] {
  const runResult = spawnSync(
    options.oxlintExecutablePath,
    ["--config", options.oxlintConfigPath, "--disable-nested-config", "--format", "json", "."],
    {
      cwd: options.targetDirectoryPath,
      encoding: "utf8",
    },
  );

  if (runResult.error) {
    throw runResult.error;
  }

  const stdout = runResult.stdout.trim();
  const stderr = runResult.stderr.trim();
  if (stdout.length === 0) {
    throw new Error(`Oxlint returned no JSON output.\n\nStderr:\n${stderr}`);
  }

  const parsedOutput: unknown = JSON.parse(stdout);
  const diagnostics = readDiagnostics(parsedOutput);

  if (runResult.status !== 0 && runResult.status !== 1) {
    throw new Error(`Oxlint failed with exit code ${String(runResult.status)}.\n\nStderr:\n${stderr}`);
  }

  return diagnostics;
}
