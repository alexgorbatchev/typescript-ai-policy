import { isAbsolute, resolve } from "node:path";
import { applyTextEdits } from "./applyTextEdits.ts";
import { createTsgoLspSemanticFixBackend } from "./backends/tsgo-lsp/createTsgoLspSemanticFixBackend.ts";
import { createInterfaceNamingConventionSemanticFixProvider } from "./providers/createInterfaceNamingConventionSemanticFixProvider.ts";
import { runOxlintJson } from "./runOxlintJson.ts";
import type {
  IApplySemanticFixesOptions,
  IApplySemanticFixesProgressEvent,
  IApplySemanticFixesResult,
  IOxlintDiagnostic,
  ISemanticFixOperation,
  ISemanticFixPlan,
  ISkippedDiagnostic,
} from "./types.ts";

function readAbsoluteDiagnosticFilePath(targetDirectoryPath: string, diagnostic: IOxlintDiagnostic): string {
  if (isAbsolute(diagnostic.filename)) {
    return diagnostic.filename;
  }

  return resolve(targetDirectoryPath, diagnostic.filename);
}

function readSkippedDiagnostic(
  targetDirectoryPath: string,
  diagnostic: IOxlintDiagnostic,
  reason: string,
): ISkippedDiagnostic {
  return {
    filePath: readAbsoluteDiagnosticFilePath(targetDirectoryPath, diagnostic),
    reason,
    ruleCode: diagnostic.code,
  };
}

function readPlanSignature(plan: ISemanticFixPlan): string {
  return JSON.stringify(plan.textEdits);
}

function readChangedFilePaths(plans: readonly ISemanticFixPlan[]): readonly string[] {
  const changedFilePathSet = new Set<string>();

  for (const plan of plans) {
    for (const textEdit of plan.textEdits) {
      changedFilePathSet.add(textEdit.filePath);
    }
  }

  return [...changedFilePathSet].sort((left, right) => left.localeCompare(right));
}

function readUniqueOperations(operations: readonly ISemanticFixOperation[]): readonly ISemanticFixOperation[] {
  const operationMap = new Map<string, ISemanticFixOperation>();

  for (const operation of operations) {
    operationMap.set(operation.id, operation);
  }

  return [...operationMap.values()];
}

function readUniquePlans(plans: readonly ISemanticFixPlan[]): readonly ISemanticFixPlan[] {
  const planMap = new Map<string, ISemanticFixPlan>();

  for (const plan of plans) {
    planMap.set(readPlanSignature(plan), plan);
  }

  return [...planMap.values()];
}

export async function applySemanticFixes(options: IApplySemanticFixesOptions): Promise<IApplySemanticFixesResult> {
  const reportProgress = (event: IApplySemanticFixesProgressEvent): void => {
    options.onProgress?.(event);
  };
  const semanticFixProvider = createInterfaceNamingConventionSemanticFixProvider();
  const semanticFixProviders = new Map([[semanticFixProvider.ruleCode, semanticFixProvider]]);
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

    const skippedDiagnostics: ISkippedDiagnostic[] = [];
    const operations: ISemanticFixOperation[] = [];

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
    const plans: ISemanticFixPlan[] = [];

    reportProgress({
      kind: "planning-start",
      operationCount: uniqueOperations.length,
    });

    for (const [operationIndex, operation] of uniqueOperations.entries()) {
      reportProgress({
        description: `Rename ${operation.symbolName} to ${operation.newName}`,
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

      if (planResult.plan.textEdits.length === 0) {
        skippedDiagnostics.push({
          filePath: operation.filePath,
          reason: `No text edits were produced for ${operation.symbolName}.`,
          ruleCode: operation.ruleCode,
        });
        continue;
      }

      plans.push(planResult.plan);
    }

    const uniquePlans = readUniquePlans(plans);
    const allTextEdits = uniquePlans.flatMap((plan) => plan.textEdits);
    const plannedChangedFilePaths = readChangedFilePaths(uniquePlans);

    reportProgress({
      dryRun: options.dryRun ?? false,
      fileCount: plannedChangedFilePaths.length,
      kind: "applying-text-edits",
      textEditCount: allTextEdits.length,
    });

    const changedFilePaths = options.dryRun ? plannedChangedFilePaths : applyTextEdits(allTextEdits);
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
