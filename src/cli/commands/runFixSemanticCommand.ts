import { isAbsolute, relative, resolve } from "node:path";
import type { TypescriptAiPolicyCliDependencies, FixSemanticCommandArguments } from "../types.ts";
import type { ApplySemanticFixesProgressEvent, SkippedDiagnostic } from "../../semantic-fixes/types.ts";

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

export async function runFixSemanticCommand(
  arguments_: FixSemanticCommandArguments,
  dependencies: TypescriptAiPolicyCliDependencies,
): Promise<void> {
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
}
