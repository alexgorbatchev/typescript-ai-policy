import { dirname, isAbsolute, relative, resolve } from "node:path";
import { applyFileChanges } from "./applyFileChanges.ts";
import { createTsgoLspSemanticFixBackend } from "./backends/tsgo-lsp/createTsgoLspSemanticFixBackend.ts";
import { createInterfaceNamingConventionSemanticFixProvider } from "./providers/createInterfaceNamingConventionSemanticFixProvider.ts";
import { createNoIPrefixedTypeAliasesSemanticFixProvider } from "./providers/createNoIPrefixedTypeAliasesSemanticFixProvider.ts";
import { createTestFileLocationConventionSemanticFixProvider } from "./providers/createTestFileLocationConventionSemanticFixProvider.ts";
import { runOxlintJson } from "./runOxlintJson.ts";
import type {
  ApplySemanticFixesOptions,
  ApplySemanticFixesProgressEvent,
  ApplySemanticFixesResult,
  OxlintDiagnostic,
  SemanticFixOperation,
  SemanticFixPlan,
  SkippedDiagnostic,
} from "./types.ts";

function readAbsoluteDiagnosticFilePath(targetDirectoryPath: string, diagnostic: OxlintDiagnostic): string {
  if (isAbsolute(diagnostic.filename)) {
    return diagnostic.filename;
  }

  return resolve(targetDirectoryPath, diagnostic.filename);
}

function readSkippedDiagnostic(
  targetDirectoryPath: string,
  diagnostic: OxlintDiagnostic,
  reason: string,
): SkippedDiagnostic {
  return {
    filePath: readAbsoluteDiagnosticFilePath(targetDirectoryPath, diagnostic),
    reason,
    ruleCode: diagnostic.code,
  };
}

function readPlanSignature(plan: SemanticFixPlan): string {
  return JSON.stringify({
    fileMoves: plan.fileMoves,
    textEdits: plan.textEdits,
  });
}

function readChangedFilePaths(plans: readonly SemanticFixPlan[]): readonly string[] {
  const changedFilePathSet = new Set<string>();
  const movedFilePathMap = new Map<string, string>();

  for (const plan of plans) {
    for (const fileMove of plan.fileMoves) {
      movedFilePathMap.set(fileMove.sourceFilePath, fileMove.destinationFilePath);
      changedFilePathSet.add(fileMove.destinationFilePath);
    }
  }

  for (const plan of plans) {
    for (const textEdit of plan.textEdits) {
      changedFilePathSet.add(movedFilePathMap.get(textEdit.filePath) ?? textEdit.filePath);
    }
  }

  return [...changedFilePathSet].sort((left, right) => left.localeCompare(right));
}

function readOperationDescription(operation: SemanticFixOperation): string {
  switch (operation.kind) {
    case "rename-symbol": {
      return `Rename ${operation.symbolName} to ${operation.newName}`;
    }
    case "move-file": {
      return `Move ${relative(dirname(operation.filePath), operation.filePath)} to ${relative(dirname(operation.filePath), operation.newFilePath)}`;
    }
  }
}

function readOperationEmptyPlanReason(operation: SemanticFixOperation): string {
  switch (operation.kind) {
    case "rename-symbol": {
      return `No text edits were produced for ${operation.symbolName}.`;
    }
    case "move-file": {
      return `No file changes were produced for ${relative(dirname(operation.filePath), operation.filePath)}.`;
    }
  }
}

function readUniqueOperations(operations: readonly SemanticFixOperation[]): readonly SemanticFixOperation[] {
  const operationMap = new Map<string, SemanticFixOperation>();

  for (const operation of operations) {
    operationMap.set(operation.id, operation);
  }

  return [...operationMap.values()];
}

function readUniquePlans(plans: readonly SemanticFixPlan[]): readonly SemanticFixPlan[] {
  const planMap = new Map<string, SemanticFixPlan>();

  for (const plan of plans) {
    planMap.set(readPlanSignature(plan), plan);
  }

  return [...planMap.values()];
}

export async function applySemanticFixes(options: ApplySemanticFixesOptions): Promise<ApplySemanticFixesResult> {
  const reportProgress = (event: ApplySemanticFixesProgressEvent): void => {
    options.onProgress?.(event);
  };
  const semanticFixProviders = new Map(
    [
      createInterfaceNamingConventionSemanticFixProvider(),
      createNoIPrefixedTypeAliasesSemanticFixProvider(),
      createTestFileLocationConventionSemanticFixProvider(),
    ].map((semanticFixProvider) => [semanticFixProvider.ruleCode, semanticFixProvider]),
  );
  const semanticFixBackend = createTsgoLspSemanticFixBackend({
    tsgoExecutablePath: options.tsgoExecutablePath,
  });

  try {
    reportProgress({
      kind: "running-oxlint",
      targetDirectoryPath: options.targetDirectoryPath,
    });

    const diagnostics = await runOxlintJson({
      oxlintConfigPath: options.oxlintConfigPath,
      oxlintExecutablePath: options.oxlintExecutablePath,
      targetDirectoryPath: options.targetDirectoryPath,
    });

    reportProgress({
      diagnosticCount: diagnostics.length,
      kind: "collected-diagnostics",
    });

    const skippedDiagnostics: SkippedDiagnostic[] = [];
    const operations: SemanticFixOperation[] = [];

    for (const diagnostic of diagnostics) {
      const semanticFixProviderForDiagnostic = semanticFixProviders.get(diagnostic.code);
      if (!semanticFixProviderForDiagnostic) {
        continue;
      }

      const operation = semanticFixProviderForDiagnostic.createOperation(diagnostic, {
        targetDirectoryPath: options.targetDirectoryPath,
      });
      if (!operation) {
        skippedDiagnostics.push(
          readSkippedDiagnostic(
            options.targetDirectoryPath,
            diagnostic,
            "No safe semantic fix is available for this diagnostic.",
          ),
        );
        continue;
      }

      operations.push(operation);
    }

    const uniqueOperations = readUniqueOperations(operations);
    const plans: SemanticFixPlan[] = [];

    reportProgress({
      kind: "planning-start",
      operationCount: uniqueOperations.length,
    });

    for (const [operationIndex, operation] of uniqueOperations.entries()) {
      reportProgress({
        description: readOperationDescription(operation),
        kind: "planning-operation",
        operationCount: uniqueOperations.length,
        operationId: operation.id,
        operationIndex: operationIndex + 1,
      });

      const planResult = await semanticFixBackend.createPlan(operation, {
        targetDirectoryPath: options.targetDirectoryPath,
      });

      if (planResult.kind === "skip") {
        skippedDiagnostics.push({
          filePath: operation.filePath,
          reason: planResult.reason,
          ruleCode: operation.ruleCode,
        });
        continue;
      }

      if (planResult.plan.textEdits.length === 0 && planResult.plan.fileMoves.length === 0) {
        skippedDiagnostics.push({
          filePath: operation.filePath,
          reason: readOperationEmptyPlanReason(operation),
          ruleCode: operation.ruleCode,
        });
        continue;
      }

      plans.push(planResult.plan);
    }

    const uniquePlans = readUniquePlans(plans);
    const allTextEdits = uniquePlans.flatMap((plan) => plan.textEdits);
    const plannedChangedFilePaths = readChangedFilePaths(uniquePlans);

    const fileMoves = uniquePlans.flatMap((plan) => plan.fileMoves);

    reportProgress({
      dryRun: options.dryRun ?? false,
      fileCount: plannedChangedFilePaths.length,
      kind: "applying-file-changes",
      moveCount: fileMoves.length,
      textEditCount: allTextEdits.length,
    });

    const changedFilePaths = options.dryRun ? plannedChangedFilePaths : applyFileChanges(allTextEdits, fileMoves);
    const result = {
      appliedFileCount: options.dryRun ? 0 : changedFilePaths.length,
      backendName: semanticFixBackend.name,
      changedFilePaths,
      plannedFixCount: uniquePlans.length,
      skippedDiagnostics,
    };

    reportProgress({
      appliedFileCount: result.appliedFileCount,
      changedFileCount: result.changedFilePaths.length,
      kind: "complete",
      plannedFixCount: result.plannedFixCount,
      skippedDiagnosticCount: result.skippedDiagnostics.length,
    });

    return result;
  } finally {
    await semanticFixBackend.dispose();
  }
}
