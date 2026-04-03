import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { applySemanticFixes } from "./applySemanticFixes.ts";
import type { IApplySemanticFixesProgressEvent, ISkippedDiagnostic } from "./types.ts";

type ICliOptions = {
  dryRun: boolean;
  targetDirectoryPath: string;
};

function readUsageText(): string {
  return [
    "Usage: bun src/semantic-fixes/runApplySemanticFixes.ts <target-directory> [--dry-run]",
    "",
    "Examples:",
    "  bun run fix:semantic -- .",
    "  bun run fix:semantic -- /path/to/project --dry-run",
  ].join("\n");
}

function readCliOptions(argv: readonly string[]): ICliOptions {
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

function formatSkippedDiagnostic(targetDirectoryPath: string, skippedDiagnostic: ISkippedDiagnostic): string {
  return `- [${skippedDiagnostic.ruleCode}] ${readDisplayPath(targetDirectoryPath, skippedDiagnostic.filePath)}: ${skippedDiagnostic.reason}`;
}

function formatProgressEvent(event: IApplySemanticFixesProgressEvent): string {
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
    case "applying-text-edits": {
      const modeLabel = event.dryRun ? "dry run" : "applying edits";
      return `${modeLabel}: ${String(event.textEditCount)} text edit(s) across ${String(event.fileCount)} file(s)`;
    }
    case "complete": {
      return `semantic fix complete: ${String(event.plannedFixCount)} plan(s), ${String(event.changedFileCount)} changed file(s), ${String(event.skippedDiagnosticCount)} skipped diagnostic(s)`;
    }
  }
}

try {
  const cliOptions = readCliOptions(process.argv);
  const result = await applySemanticFixes({
    dryRun: cliOptions.dryRun,
    onProgress(event) {
      console.log(formatProgressEvent(event));
    },
    oxlintConfigPath: resolve(process.cwd(), "src/oxlint/oxlint.config.ts"),
    oxlintExecutablePath: resolve(process.cwd(), "node_modules/.bin/oxlint"),
    targetDirectoryPath: cliOptions.targetDirectoryPath,
    tsgoExecutablePath: resolve(process.cwd(), "node_modules/.bin/tsgo"),
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
