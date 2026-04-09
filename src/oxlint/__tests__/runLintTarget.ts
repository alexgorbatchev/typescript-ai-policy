import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";

export type LintTargetIssue = {
  column: number | null;
  filePath: string;
  line: number | null;
  message: string;
  ruleId: string;
  severity: string;
};

export type LintTargetResult = {
  exitCode: number;
  header: {
    configPath: string;
    targetPath: string;
  };
  issues: LintTargetIssue[];
  rawOutput: string;
};

type OxlintJsonDiagnostic = {
  code: string;
  filename: string;
  labels: Array<{
    span: {
      column: number;
      line: number;
    };
  }>;
  message: string;
  severity: string;
};

type OxlintJsonOutput = {
  diagnostics: OxlintJsonDiagnostic[];
};

type SplitLintTargetOutputResult = {
  headerLines: [string, string, string];
  jsonText: string;
};

const OUTPUT_TEXT_DECODER = new TextDecoder();
const REPOSITORY_ROOT_PATH = resolve(import.meta.dir, "../../..");
const LINT_TARGET_SCRIPT_PATH = join(REPOSITORY_ROOT_PATH, "scripts", "lint-target.sh");

function decodeProcessOutput(output: Uint8Array): string {
  return OUTPUT_TEXT_DECODER.decode(output).replace(/\r\n/gu, "\n");
}

function normalizeLintTargetOutput(output: string, fixtureRepositoryPath: string): string {
  const canonicalFixtureRepositoryPath = realpathSync.native(fixtureRepositoryPath);

  return output
    .replaceAll(REPOSITORY_ROOT_PATH, "<repo-root>")
    .replaceAll(canonicalFixtureRepositoryPath, "<fixture-root>")
    .replaceAll(fixtureRepositoryPath, "<fixture-root>")
    .trimEnd();
}

function splitLintTargetOutput(output: string): SplitLintTargetOutputResult {
  const jsonStartIndex = output.indexOf("{");
  if (jsonStartIndex === -1) {
    throw new Error(`Could not find Oxlint JSON output in lint-target output:\n${output}`);
  }

  const headerText = output.slice(0, jsonStartIndex).trimEnd();
  const headerLines = headerText.split("\n");
  if (headerLines.length !== 3) {
    throw new Error(`Expected exactly 3 lint-target header lines before JSON output, got ${headerLines.length}.`);
  }

  return {
    headerLines: [headerLines[0] ?? "", headerLines[1] ?? "", headerLines[2] ?? ""],
    jsonText: output.slice(jsonStartIndex),
  };
}

function readHeaderValue(headerLine: string, key: string): string {
  const expectedPrefix = `${key}: `;
  if (!headerLine.startsWith(expectedPrefix)) {
    throw new Error(`Expected header line to start with "${expectedPrefix}", got: ${headerLine}`);
  }

  return headerLine.slice(expectedPrefix.length);
}

function readIssues(oxlintJsonOutput: OxlintJsonOutput): LintTargetIssue[] {
  return oxlintJsonOutput.diagnostics.map((diagnostic) => ({
    column: diagnostic.labels[0]?.span.column ?? null,
    filePath: diagnostic.filename,
    line: diagnostic.labels[0]?.span.line ?? null,
    message: diagnostic.message,
    ruleId: diagnostic.code,
    severity: diagnostic.severity,
  }));
}

export function runLintTarget(fixtureRepositoryPath: string): LintTargetResult {
  const lintTargetProcess = Bun.spawnSync({
    cmd: ["bash", LINT_TARGET_SCRIPT_PATH, fixtureRepositoryPath, "--format", "json"],
    cwd: REPOSITORY_ROOT_PATH,
    stderr: "pipe",
    stdout: "pipe",
  });

  const rawOutput = normalizeLintTargetOutput(
    `${decodeProcessOutput(lintTargetProcess.stdout)}${decodeProcessOutput(lintTargetProcess.stderr)}`,
    fixtureRepositoryPath,
  );
  const { headerLines, jsonText } = splitLintTargetOutput(rawOutput);
  const oxlintJsonOutput = JSON.parse(jsonText) as OxlintJsonOutput;

  return {
    exitCode: lintTargetProcess.exitCode,
    header: {
      configPath: readHeaderValue(headerLines[1], "config"),
      targetPath: readHeaderValue(headerLines[2], "target"),
    },
    issues: readIssues(oxlintJsonOutput),
    rawOutput,
  };
}
