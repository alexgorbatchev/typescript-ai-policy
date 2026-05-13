#!/usr/bin/env bun

import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import { readPublishedRuleGuidanceOutput } from "../oxlint/readPublishedRuleGuidanceOutput.ts";
import { applySemanticFixes } from "../semantic-fixes/applySemanticFixes.ts";
import { readSemanticFixRuntimePaths } from "../semantic-fixes/readSemanticFixRuntimePaths.ts";
import type {
  ApplySemanticFixesOptions,
  ApplySemanticFixesProgressEvent,
  ApplySemanticFixesResult,
  SkippedDiagnostic,
} from "../semantic-fixes/types.ts";
import { printPackageUsageNoticeOnce } from "../shared/packageUsageNotice.ts";

type EnvironmentVariables = Record<string, string | undefined>;

type CheckRunner = (command: readonly string[]) => Promise<void>;

type RunCheckDependencies = {
  env: EnvironmentVariables;
  runCommand: CheckRunner;
};

type GuidanceCommandOptions = {
  json?: boolean;
};

type GuidanceOutputOptions = {
  json?: boolean;
};

type CliWrite = (text: string) => void;

type FixSemanticCommandArguments = {
  dryRun: boolean;
  targetDirectoryPath: string;
};

type FixSemanticCommandOptions = {
  dryRun?: boolean;
};

type TypescriptAiPolicyCliDependencies = {
  applySemanticFixes: (options: ApplySemanticFixesOptions) => Promise<ApplySemanticFixesResult>;
  readPublishedRuleGuidanceOutput: (options?: GuidanceOutputOptions) => string;
  readSemanticFixRuntimePaths: () => {
    oxlintConfigPath: string;
    oxlintExecutablePath: string;
    tsgoExecutablePath: string;
  };
  runCheck: () => Promise<void>;
  writeStderr: (text: string) => void;
  writeStdout: (text: string) => void;
};

const DEFAULT_RUN_CHECK_DEPENDENCIES: RunCheckDependencies = {
  env: process.env,
  async runCommand(command: readonly string[]): Promise<void> {
    const checkProcess = Bun.spawn({
      cmd: [...command],
      stdin: "inherit",
      stderr: "inherit",
      stdout: "inherit",
    });
    const exitCode = await checkProcess.exited;

    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${String(exitCode)}: ${command.join(" ")}`);
    }
  },
};

const defaultDependencies: TypescriptAiPolicyCliDependencies = {
  applySemanticFixes,
  readPublishedRuleGuidanceOutput,
  readSemanticFixRuntimePaths,
  runCheck,
  writeStderr(text: string) {
    process.stderr.write(text);
  },
  writeStdout(text: string) {
    process.stdout.write(text);
  },
};

function readOxfmtCheckCommand(): readonly string[] {
  return ["bun", "--bun", "oxfmt", "--check", "."];
}

function readOxlintCheckCommand(env: EnvironmentVariables): readonly string[] {
  if (env.AGENT === "1") {
    return ["bun", "--bun", "oxlint", "--format", "agent", "."];
  }

  return ["bun", "--bun", "oxlint", "."];
}

function writeStdoutLine(dependencies: TypescriptAiPolicyCliDependencies, text: string): void {
  dependencies.writeStdout(`${text}\n`);
}

function readDisplayPath(targetDirectoryPath: string, filePath: string): string {
  const absoluteFilePath = isAbsolute(filePath) ? filePath : resolve(targetDirectoryPath, filePath);
  const relativeFilePath = relative(targetDirectoryPath, absoluteFilePath);
  return relativeFilePath.length > 0 ? relativeFilePath : ".";
}

function formatSkippedDiagnostic(targetDirectoryPath: string, skippedDiagnostic: SkippedDiagnostic): string {
  return `- [${skippedDiagnostic.ruleCode}] ${readDisplayPath(targetDirectoryPath, skippedDiagnostic.filePath)}: ${skippedDiagnostic.reason}`;
}

function formatProgressEvent(event: ApplySemanticFixesProgressEvent): string {
  switch (event.kind) {
    case "running-oxlint": {
      return "running oxlint...";
    }
    case "collected-diagnostics": {
      return `semantic-fix diagnostics: ${String(event.diagnosticCount)}`;
    }
    case "planning-start": {
      return `planning semantic fixes: ${String(event.operationCount)} candidate operation(s)`;
    }
    case "planning-operation": {
      return `planning semantic fix ${String(event.operationIndex)}/${String(event.operationCount)}: ${event.description}`;
    }
    case "applying-file-changes": {
      const modeLabel = event.dryRun ? "dry run" : "applying changes";
      return `${modeLabel}: ${String(event.textEditCount)} text edit(s) and ${String(event.moveCount)} file move(s) across ${String(event.fileCount)} file(s)`;
    }
    case "complete": {
      return `semantic fix complete: ${String(event.plannedFixCount)} plan(s), ${String(event.changedFileCount)} changed file(s), ${String(event.skippedDiagnosticCount)} skipped diagnostic(s)`;
    }
  }
}

function readTargetDirectoryPath(targetDirectoryArgument: string): string {
  const targetDirectoryPath = resolve(targetDirectoryArgument);

  if (!existsSync(targetDirectoryPath)) {
    throw new InvalidArgumentError(`Target directory does not exist: ${targetDirectoryPath}`);
  }

  if (!statSync(targetDirectoryPath).isDirectory()) {
    throw new InvalidArgumentError(`Target path is not a directory: ${targetDirectoryPath}`);
  }

  return targetDirectoryPath;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createTypescriptAiPolicyCli(dependencies: TypescriptAiPolicyCliDependencies): Command {
  const program = new Command().name("typescript-ai-policy").showHelpAfterError();

  program.configureOutput({
    outputError(text: string, write: CliWrite) {
      write(text);
    },
    writeErr(text: string) {
      dependencies.writeStderr(text);
    },
    writeOut(text: string) {
      dependencies.writeStdout(text);
    },
  });
  program.exitOverride();

  const checkCommand = new Command("check").description("Run formatter and linter checks").action(async () => {
    await dependencies.runCheck();
  });

  const fixSemanticCommand = new Command("fix-semantic")
    .description("Apply safe semantic fixes for supported policy diagnostics")
    .argument("<target-directory>", "Target directory to lint and fix", readTargetDirectoryPath)
    .option("--dry-run", "Print planned fix scope without mutating files")
    .action(async (targetDirectoryPath: string, options: FixSemanticCommandOptions) => {
      const arguments_: FixSemanticCommandArguments = {
        dryRun: options.dryRun ?? false,
        targetDirectoryPath,
      };
      const runtimePaths = dependencies.readSemanticFixRuntimePaths();
      const result = await dependencies.applySemanticFixes({
        dryRun: arguments_.dryRun,
        onProgress(event) {
          writeStdoutLine(dependencies, formatProgressEvent(event));
        },
        oxlintConfigPath: runtimePaths.oxlintConfigPath,
        oxlintExecutablePath: runtimePaths.oxlintExecutablePath,
        targetDirectoryPath: arguments_.targetDirectoryPath,
        tsgoExecutablePath: runtimePaths.tsgoExecutablePath,
      });

      writeStdoutLine(dependencies, `backend: ${result.backendName}`);
      writeStdoutLine(dependencies, `planned fixes: ${String(result.plannedFixCount)}`);
      writeStdoutLine(dependencies, `applied files: ${String(result.appliedFileCount)}`);

      if (result.changedFilePaths.length > 0) {
        writeStdoutLine(dependencies, "changed files:");

        for (const changedFilePath of result.changedFilePaths) {
          writeStdoutLine(dependencies, `- ${readDisplayPath(arguments_.targetDirectoryPath, changedFilePath)}`);
        }
      }

      if (result.skippedDiagnostics.length > 0) {
        writeStdoutLine(dependencies, "skipped diagnostics:");

        for (const skippedDiagnostic of result.skippedDiagnostics) {
          writeStdoutLine(dependencies, formatSkippedDiagnostic(arguments_.targetDirectoryPath, skippedDiagnostic));
        }
      }
    });

  const guidanceCommand = new Command("guidance")
    .description("Print authoritative rule guidance for AI agents")
    .option("--json", "Print guidance as JSON")
    .action(async (options: GuidanceCommandOptions) => {
      dependencies.writeStdout(dependencies.readPublishedRuleGuidanceOutput({ json: options.json ?? false }));
    });

  checkCommand.copyInheritedSettings(program);
  fixSemanticCommand.copyInheritedSettings(program);
  guidanceCommand.copyInheritedSettings(program);

  program.addCommand(checkCommand);
  program.addCommand(fixSemanticCommand);
  return program.addCommand(guidanceCommand);
}

export async function runCheck(dependencies: RunCheckDependencies = DEFAULT_RUN_CHECK_DEPENDENCIES): Promise<void> {
  await dependencies.runCommand(readOxfmtCheckCommand());
  await dependencies.runCommand(readOxlintCheckCommand(dependencies.env));
}

export async function runTypescriptAiPolicyCli(
  argv: readonly string[],
  dependencies: TypescriptAiPolicyCliDependencies = defaultDependencies,
): Promise<number> {
  printPackageUsageNoticeOnce(dependencies.writeStderr);

  const cli = createTypescriptAiPolicyCli(dependencies);

  if (argv.length <= 2) {
    cli.outputHelp({ error: true });
    return 1;
  }

  try {
    await cli.parseAsync([...argv]);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    dependencies.writeStderr(`${readErrorMessage(error)}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await runTypescriptAiPolicyCli(process.argv);
}
