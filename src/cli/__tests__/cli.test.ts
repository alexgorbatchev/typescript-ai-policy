import dedentString from "@alexgorbatchev/dedent-string";
import { beforeEach, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { join } from "node:path";
import {
  readPackageUsageNotice,
  resetPackageUsageNoticeForTests,
  setPackageUsageNoticeWriterForTests,
} from "../../shared/packageUsageNotice.ts";
import type {
  ApplySemanticFixesOptions,
  ApplySemanticFixesProgressEvent,
  ApplySemanticFixesResult,
} from "../../semantic-fixes/types.ts";
import { runCheck, runTypescriptAiPolicyCli } from "../cli.ts";

const FIXTURE_RUNTIME_PATHS = {
  oxlintConfigPath: "/runtime/oxlint.config.ts",
  oxlintExecutablePath: "/runtime/oxlint",
  tscExecutablePath: "/runtime/tsc",
};

type TestHarness = {
  applyCalls: ApplySemanticFixesOptions[];
  dependencies: TypescriptAiPolicyCliDependencies;
  guidanceJsonOutput: string;
  guidanceOutput: string;
  readRunCheckCalls: () => number;
  stderr: string[];
  stdout: string[];
};

type TypescriptAiPolicyCliDependencies = {
  applySemanticFixes: (options: ApplySemanticFixesOptions) => Promise<ApplySemanticFixesResult>;
  readPublishedRuleGuidanceOutput: (options?: { json?: boolean }) => string;
  readSemanticFixRuntimePaths: () => {
    oxlintConfigPath: string;
    oxlintExecutablePath: string;
    tscExecutablePath: string;
  };
  runCheck: () => Promise<void>;
  writeStderr: (text: string) => void;
  writeStdout: (text: string) => void;
};

type TestHarnessOptions = {
  applyResult?: ApplySemanticFixesResult;
  guidanceJsonOutput?: string;
  guidanceOutput?: string;
  progressEvents?: readonly ApplySemanticFixesProgressEvent[];
};

function readExpectedCliOutput(text: string): string {
  return `${dedentString(text)}\n`;
}

function createTestHarness(options: TestHarnessOptions = {}): TestHarness {
  const applyCalls: ApplySemanticFixesOptions[] = [];
  let runCheckCalls = 0;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const guidanceJsonOutput = options.guidanceJsonOutput ?? "[]\n";
  const guidanceOutput = options.guidanceOutput ?? "";
  const applyResult: ApplySemanticFixesResult = options.applyResult ?? {
    appliedFileCount: 0,
    backendName: "tsc-lsp+native",
    changedFilePaths: [],
    plannedFixCount: 0,
    skippedDiagnostics: [],
  };
  const progressEvents = options.progressEvents ?? [];

  return {
    applyCalls,
    dependencies: {
      async applySemanticFixes(applyOptions: ApplySemanticFixesOptions): Promise<ApplySemanticFixesResult> {
        applyCalls.push(applyOptions);

        for (const progressEvent of progressEvents) {
          applyOptions.onProgress?.(progressEvent);
        }

        return applyResult;
      },
      readSemanticFixRuntimePaths() {
        return FIXTURE_RUNTIME_PATHS;
      },
      readPublishedRuleGuidanceOutput(options) {
        const isJsonOutput = options?.json === true;
        const guidanceOutputByMode = new Map([
          [false, guidanceOutput],
          [true, guidanceJsonOutput],
        ]);

        return guidanceOutputByMode.get(isJsonOutput) ?? guidanceOutput;
      },
      async runCheck() {
        runCheckCalls += 1;
      },
      writeStderr(text: string) {
        stderr.push(text);
      },
      writeStdout(text: string) {
        stdout.push(text);
      },
    },
    guidanceJsonOutput,
    guidanceOutput,
    readRunCheckCalls() {
      return runCheckCalls;
    },
    stderr,
    stdout,
  };
}

function readCliSourceFile(): string {
  const cliFilePath = resolve(import.meta.dir, "../cli.ts");

  return readFileSync(cliFilePath, "utf8");
}

beforeEach(() => {
  resetPackageUsageNoticeForTests();
  setPackageUsageNoticeWriterForTests(() => {});
});

it("uses the Bun env shebang", () => {
  const cliSourceFile = readCliSourceFile();

  expect(cliSourceFile.startsWith("#!/usr/bin/env bun\n")).toBe(true);
});

it("runs the fix-semantic subcommand through the package CLI", async () => {
  const targetDirectoryPath = await mkdtemp(join(tmpdir(), "typescript-ai-policy-cli-"));
  const harness = createTestHarness({
    applyResult: {
      appliedFileCount: 1,
      backendName: "tsc-lsp+native",
      changedFilePaths: [join(targetDirectoryPath, "models.ts")],
      plannedFixCount: 1,
      skippedDiagnostics: [],
    },
    progressEvents: [
      {
        kind: "running-oxlint",
        targetDirectoryPath,
      },
      {
        diagnosticCount: 1,
        kind: "collected-diagnostics",
      },
      {
        kind: "planning-start",
        operationCount: 1,
      },
      {
        description: "Rename UserProfile to IUserProfile",
        kind: "planning-operation",
        operationCount: 1,
        operationId: "operation-1",
        operationIndex: 1,
      },
      {
        dryRun: false,
        fileCount: 1,
        kind: "applying-file-changes",
        moveCount: 0,
        textEditCount: 2,
      },
      {
        appliedFileCount: 1,
        changedFileCount: 1,
        kind: "complete",
        plannedFixCount: 1,
        skippedDiagnosticCount: 0,
      },
    ],
  });

  try {
    const exitCode = await runTypescriptAiPolicyCli(
      ["node", "typescript-ai-policy", "fix-semantic", targetDirectoryPath],
      harness.dependencies,
    );

    expect(exitCode).toBe(0);
    expect(harness.applyCalls).toEqual([
      {
        dryRun: false,
        onProgress: harness.applyCalls[0]?.onProgress,
        oxlintConfigPath: FIXTURE_RUNTIME_PATHS.oxlintConfigPath,
        oxlintExecutablePath: FIXTURE_RUNTIME_PATHS.oxlintExecutablePath,
        targetDirectoryPath,
        tscExecutablePath: FIXTURE_RUNTIME_PATHS.tscExecutablePath,
      },
    ]);
    expect(harness.stdout.join("")).toBe(
      readExpectedCliOutput(`
      running oxlint...
      semantic-fix diagnostics: 1
      planning semantic fixes: 1 candidate operation(s)
      planning semantic fix 1/1: Rename UserProfile to IUserProfile
      applying changes: 2 text edit(s) and 0 file move(s) across 1 file(s)
      semantic fix complete: 1 plan(s), 1 changed file(s), 0 skipped diagnostic(s)
      backend: tsc-lsp+native
      planned fixes: 1
      applied files: 1
      changed files:
      - models.ts
    `),
    );
    expect(harness.stderr).toEqual([readPackageUsageNotice()]);
  } finally {
    await rm(targetDirectoryPath, { force: true, recursive: true });
  }
});

it("passes the dry-run flag through the fix-semantic subcommand", async () => {
  const targetDirectoryPath = await mkdtemp(join(tmpdir(), "typescript-ai-policy-cli-"));
  const harness = createTestHarness({
    applyResult: {
      appliedFileCount: 0,
      backendName: "tsc-lsp+native",
      changedFilePaths: [join(targetDirectoryPath, "__tests__/useAccount.test.ts")],
      plannedFixCount: 1,
      skippedDiagnostics: [
        {
          filePath: join(targetDirectoryPath, "stories.tsx"),
          reason: "No safe semantic fix is available for this diagnostic.",
          ruleCode: "@alexgorbatchev/story-export-contract",
        },
      ],
    },
    progressEvents: [
      {
        kind: "running-oxlint",
        targetDirectoryPath,
      },
      {
        diagnosticCount: 2,
        kind: "collected-diagnostics",
      },
      {
        kind: "planning-start",
        operationCount: 1,
      },
      {
        description: "Move useAccount.test.ts to __tests__/useAccount.test.ts",
        kind: "planning-operation",
        operationCount: 1,
        operationId: "operation-1",
        operationIndex: 1,
      },
      {
        dryRun: true,
        fileCount: 1,
        kind: "applying-file-changes",
        moveCount: 1,
        textEditCount: 1,
      },
      {
        appliedFileCount: 0,
        changedFileCount: 1,
        kind: "complete",
        plannedFixCount: 1,
        skippedDiagnosticCount: 1,
      },
    ],
  });

  try {
    const exitCode = await runTypescriptAiPolicyCli(
      ["node", "typescript-ai-policy", "fix-semantic", targetDirectoryPath, "--dry-run"],
      harness.dependencies,
    );

    expect(exitCode).toBe(0);
    expect(harness.applyCalls).toEqual([
      {
        dryRun: true,
        onProgress: harness.applyCalls[0]?.onProgress,
        oxlintConfigPath: FIXTURE_RUNTIME_PATHS.oxlintConfigPath,
        oxlintExecutablePath: FIXTURE_RUNTIME_PATHS.oxlintExecutablePath,
        targetDirectoryPath,
        tscExecutablePath: FIXTURE_RUNTIME_PATHS.tscExecutablePath,
      },
    ]);
    expect(harness.stdout.join("")).toBe(
      readExpectedCliOutput(`
      running oxlint...
      semantic-fix diagnostics: 2
      planning semantic fixes: 1 candidate operation(s)
      planning semantic fix 1/1: Move useAccount.test.ts to __tests__/useAccount.test.ts
      dry run: 1 text edit(s) and 1 file move(s) across 1 file(s)
      semantic fix complete: 1 plan(s), 1 changed file(s), 1 skipped diagnostic(s)
      backend: tsc-lsp+native
      planned fixes: 1
      applied files: 0
      changed files:
      - __tests__/useAccount.test.ts
      skipped diagnostics:
      - [@alexgorbatchev/story-export-contract] stories.tsx: No safe semantic fix is available for this diagnostic.
    `),
    );
    expect(harness.stderr).toEqual([readPackageUsageNotice()]);
  } finally {
    await rm(targetDirectoryPath, { force: true, recursive: true });
  }
});

it("prints CLI help when no subcommand is provided", async () => {
  const harness = createTestHarness();

  const exitCode = await runTypescriptAiPolicyCli(["node", "typescript-ai-policy"], harness.dependencies);

  expect(exitCode).toBe(1);
  expect(harness.stdout).toEqual([]);
  expect(harness.stderr.join("")).toBe(
    `${readPackageUsageNotice()}${readExpectedCliOutput(`
      Usage: typescript-ai-policy [options] [command]

      Options:
        -h, --help                                 display help for command

      Commands:
        check                                      Run formatter and linter checks
        fix-semantic [options] <target-directory>  Apply safe semantic fixes for supported policy diagnostics
        guidance [options]                         Print authoritative rule guidance for AI agents
        help [command]                             display help for command
    `)}`,
  );
});

it("prints authoritative rule guidance through the package CLI", async () => {
  const harness = createTestHarness({
    guidanceOutput: readExpectedCliOutput(`
      - **@alexgorbatchev/no-react-create-element**: Use JSX. Do not call
        React.createElement directly in application code. Keep rendering
        declarative.
    `),
  });

  const exitCode = await runTypescriptAiPolicyCli(["node", "typescript-ai-policy", "guidance"], harness.dependencies);

  expect(exitCode).toBe(0);
  expect(harness.stdout.join("")).toBe(harness.guidanceOutput);
  expect(harness.stderr).toEqual([readPackageUsageNotice()]);
});

it("runs the check subcommand through the package CLI", async () => {
  const harness = createTestHarness();

  const exitCode = await runTypescriptAiPolicyCli(["node", "typescript-ai-policy", "check"], harness.dependencies);

  expect(exitCode).toBe(0);
  expect(harness.readRunCheckCalls()).toBe(1);
  expect(harness.stdout).toEqual([]);
  expect(harness.stderr).toEqual([readPackageUsageNotice()]);
});

it("prints authoritative rule guidance as JSON through the package CLI", async () => {
  const harness = createTestHarness({
    guidanceJsonOutput:
      '[{"ruleName":"@alexgorbatchev/no-react-create-element","guidance":"Use JSX. Do not call React.createElement directly."}]\n',
  });

  const exitCode = await runTypescriptAiPolicyCli(
    ["node", "typescript-ai-policy", "guidance", "--json"],
    harness.dependencies,
  );

  expect(exitCode).toBe(0);
  expect(harness.stdout.join("")).toBe(harness.guidanceJsonOutput);
  expect(harness.stderr).toEqual([readPackageUsageNotice()]);
});

it("reports invalid target-directory arguments through the package CLI", async () => {
  const harness = createTestHarness();
  const missingDirectoryPath = join(tmpdir(), "typescript-ai-policy-cli-does-not-exist");

  const exitCode = await runTypescriptAiPolicyCli(
    ["node", "typescript-ai-policy", "fix-semantic", missingDirectoryPath],
    harness.dependencies,
  );

  expect(exitCode).toBe(1);
  expect(harness.stdout).toEqual([]);
  expect(harness.stderr.join("")).toBe(
    `${readPackageUsageNotice()}${readExpectedCliOutput(`
      error: command-argument value '${missingDirectoryPath}' is invalid for argument 'target-directory'. Target directory does not exist: ${missingDirectoryPath}

      Usage: typescript-ai-policy fix-semantic [options] <target-directory>

      Apply safe semantic fixes for supported policy diagnostics

      Arguments:
        target-directory  Target directory to lint and fix

      Options:
        --dry-run         Print planned fix scope without mutating files
        -h, --help        display help for command
    `)}`,
  );
});

it("prints the package usage notice only once across repeated CLI invocations", async () => {
  const harness = createTestHarness();

  expect(await runTypescriptAiPolicyCli(["node", "typescript-ai-policy", "guidance"], harness.dependencies)).toBe(0);
  expect(await runTypescriptAiPolicyCli(["node", "typescript-ai-policy", "guidance"], harness.dependencies)).toBe(0);

  expect(harness.stderr).toEqual([readPackageUsageNotice()]);
});

it("runs formatter then linter checks by default", async () => {
  const commands: Array<readonly string[]> = [];

  await runCheck({
    env: {},
    async runCommand(command) {
      commands.push(command);
    },
  });

  expect(commands).toEqual([
    ["bun", "--bun", "oxfmt", "--check", "."],
    ["bun", "--bun", "oxlint", "."],
  ]);
});

it("runs oxlint with agent format when AGENT=1", async () => {
  const commands: Array<readonly string[]> = [];

  await runCheck({
    env: {
      AGENT: "1",
    },
    async runCommand(command) {
      commands.push(command);
    },
  });

  expect(commands).toEqual([
    ["bun", "--bun", "oxfmt", "--check", "."],
    ["bun", "--bun", "oxlint", "--format", "agent", "."],
  ]);
});

it("stops after the formatter when the formatter fails", async () => {
  const commands: Array<readonly string[]> = [];

  await expect(
    runCheck({
      env: {},
      async runCommand(command) {
        commands.push(command);

        return Promise.reject(new Error("formatter failed"));
      },
    }),
  ).rejects.toThrow("formatter failed");

  expect(commands).toEqual([["bun", "--bun", "oxfmt", "--check", "."]]);
});
