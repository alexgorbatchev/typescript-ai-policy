#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { applySemanticFixes } from "./applySemanticFixes.ts";
import { readSemanticFixRuntimePaths } from "./readSemanticFixRuntimePaths.ts";
import type { ApplySemanticFixesProgressEvent, SkippedDiagnostic } from "./types.ts";

type CliOptions = {
  dryRun: boolean;
  targetDirectoryPath: string;
};

const SEMANTIC_FIX_BIN_NAME = "typescript-ai-policy-fix-semantic";

function readUsageText(): string {
  return [
    "Usage:",
    `  ${SEMANTIC_FIX_BIN_NAME} <target-directory> [--dry-run]`,
    "  bun run fix:semantic -- <target-directory> [--dry-run]",
    "",
    "Examples:",
    `  ${SEMANTIC_FIX_BIN_NAME} .`,
    `  ${SEMANTIC_FIX_BIN_NAME} /path/to/project --dry-run`,
    "  bun run fix:semantic -- .",
  ].join("\n");
}

function readCliOptions(argv: readonly string[]): CliOptions {
  const remainingArguments = argv.slice(2);
  const targetDirectoryArgument = remainingArguments.find((argument) => !argument.startsWith("-"));
  if (!targetDirectoryArgument) {
    throw new Error(readUsageText());
  }

  const targetDirectoryPath = resolve(targetDirectoryArgument);
  if (!existsSync(targetDirectoryPath)) {
    throw new Error(`Target directory does not exist: ${targetDirectoryPath}`);
  }

  if (!statSync(targetDirectoryPath).isDirectory()) {
    throw new Error(`Target path is not a directory: ${targetDirectoryPath}`);
  }

  return {
    dryRun: remainingArguments.includes("--dry-run"),
    targetDirectoryPath,
  };
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

try {
  const cliOptions = readCliOptions(process.argv);
  const runtimePaths = readSemanticFixRuntimePaths();
  const result = await applySemanticFixes({
    dryRun: cliOptions.dryRun,
    onProgress(event) {
      console.log(formatProgressEvent(event));
    },
    oxlintConfigPath: runtimePaths.oxlintConfigPath,
    oxlintExecutablePath: runtimePaths.oxlintExecutablePath,
    targetDirectoryPath: cliOptions.targetDirectoryPath,
    tsgoExecutablePath: runtimePaths.tsgoExecutablePath,
  });

  console.log(`backend: ${result.backendName}`);
  console.log(`planned fixes: ${String(result.plannedFixCount)}`);
  console.log(`applied files: ${String(result.appliedFileCount)}`);

  if (result.changedFilePaths.length > 0) {
    console.log("changed files:");
    for (const changedFilePath of result.changedFilePaths) {
      console.log(`- ${readDisplayPath(cliOptions.targetDirectoryPath, changedFilePath)}`);
    }
  }

  if (result.skippedDiagnostics.length > 0) {
    console.log("skipped diagnostics:");
    for (const skippedDiagnostic of result.skippedDiagnostics) {
      console.log(formatSkippedDiagnostic(cliOptions.targetDirectoryPath, skippedDiagnostic));
    }
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(errorMessage);
  process.exitCode = 1;
}
