import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readMovedFileTextEdits } from "../../readMovedFileTextEdits.ts";
import { TsgoLspClient } from "./TsgoLspClient.ts";
import type {
  ApplySemanticFixesOptions,
  FileMove,
  MoveFileOperation,
  SemanticFixBackend,
  SemanticFixBackendContext,
  SemanticFixOperation,
  SemanticFixPlan,
  SemanticFixPlanResult,
  SymbolRenameOperation,
  TextEdit,
} from "../../types.ts";

type LspPosition = {
  character: number;
  line: number;
};

type LspRange = {
  end: LspPosition;
  start: LspPosition;
};

type LspTextEdit = {
  newText: string;
  range: LspRange;
};

type LspWorkspaceChanges = Record<string, readonly LspTextEdit[]>;

type LspWorkspaceEdit = {
  changes: LspWorkspaceChanges;
};

type ClientCache = Map<string, TsgoLspClient>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLspPosition(value: unknown): value is LspPosition {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.line === "number" && typeof value.character === "number";
}

function isLspRange(value: unknown): value is LspRange {
  if (!isRecord(value)) {
    return false;
  }

  return isLspPosition(value.start) && isLspPosition(value.end);
}

function isLspTextEdit(value: unknown): value is LspTextEdit {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.newText === "string" && isLspRange(value.range);
}

function isLspWorkspaceEdit(value: unknown): value is LspWorkspaceEdit {
  if (!isRecord(value) || !isRecord(value.changes)) {
    return false;
  }

  for (const textEdits of Object.values(value.changes)) {
    if (!Array.isArray(textEdits)) {
      return false;
    }

    for (const textEdit of textEdits) {
      if (!isLspTextEdit(textEdit)) {
        return false;
      }
    }
  }

  return true;
}

function compareTextEdit(left: TextEdit, right: TextEdit): number {
  if (left.filePath !== right.filePath) {
    return left.filePath.localeCompare(right.filePath);
  }

  if (left.start.line !== right.start.line) {
    return left.start.line - right.start.line;
  }

  if (left.start.character !== right.start.character) {
    return left.start.character - right.start.character;
  }

  return left.newText.localeCompare(right.newText);
}

function readTextEdit(uri: string, textEdit: LspTextEdit): TextEdit {
  return {
    end: textEdit.range.end,
    filePath: fileURLToPath(uri),
    newText: textEdit.newText,
    start: textEdit.range.start,
  };
}

function readTextEdits(workspaceEdit: LspWorkspaceEdit): readonly TextEdit[] {
  const textEdits: TextEdit[] = [];

  for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
    for (const textEdit of edits) {
      textEdits.push(readTextEdit(uri, textEdit));
    }
  }

  return textEdits.sort(compareTextEdit);
}

function readFailureReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function readClient(
  clientCache: ClientCache,
  context: SemanticFixBackendContext,
  options: Pick<ApplySemanticFixesOptions, "tsgoExecutablePath">,
): Promise<TsgoLspClient> {
  const cachedClient = clientCache.get(context.targetDirectoryPath);
  if (cachedClient) {
    return cachedClient;
  }

  const client = new TsgoLspClient({
    tsgoExecutablePath: options.tsgoExecutablePath,
    workspacePath: context.targetDirectoryPath,
  });
  await client.initialize();
  clientCache.set(context.targetDirectoryPath, client);
  return client;
}

function readRenameSymbolDescription(operation: SymbolRenameOperation): string {
  return `Rename ${operation.symbolName} to ${operation.newName}`;
}

function readMoveFileDescription(operation: MoveFileOperation): string {
  return `Move ${operation.filePath} to ${operation.newFilePath}`;
}

function readPlan(
  operation: SemanticFixOperation,
  textEdits: readonly TextEdit[],
  fileMoves: readonly FileMove[] = [],
): SemanticFixPlan {
  return {
    description:
      operation.kind === "rename-symbol" ? readRenameSymbolDescription(operation) : readMoveFileDescription(operation),
    fileMoves,
    operationId: operation.id,
    ruleCode: operation.ruleCode,
    textEdits,
  };
}

export function createTsgoLspSemanticFixBackend(
  options: Pick<ApplySemanticFixesOptions, "tsgoExecutablePath">,
): SemanticFixBackend {
  const clientCache: ClientCache = new Map();

  return {
    async createPlan(operation, context): Promise<SemanticFixPlanResult> {
      switch (operation.kind) {
        case "rename-symbol": {
          const client = await readClient(clientCache, context, options);

          try {
            await client.prepareRename(operation.filePath, operation.position);
          } catch (error) {
            return {
              kind: "skip",
              reason: readFailureReason(error),
            };
          }

          let renameResult: unknown;

          try {
            renameResult = await client.rename(operation.filePath, operation.position, operation.newName);
          } catch (error) {
            return {
              kind: "skip",
              reason: readFailureReason(error),
            };
          }
          if (renameResult === null) {
            return {
              kind: "skip",
              reason: `tsgo returned no edits for ${operation.symbolName}`,
            };
          }

          if (!isLspWorkspaceEdit(renameResult)) {
            throw new Error(`Unexpected tsgo rename response: ${JSON.stringify(renameResult)}`);
          }

          return {
            kind: "plan",
            plan: readPlan(operation, readTextEdits(renameResult)),
          };
        }
        case "move-file": {
          if (existsSync(operation.newFilePath)) {
            return {
              kind: "skip",
              reason: `Cannot move test file because the canonical destination already exists: ${operation.newFilePath}`,
            };
          }

          return {
            kind: "plan",
            plan: readPlan(operation, readMovedFileTextEdits(operation.filePath, operation.newFilePath), [
              {
                destinationFilePath: operation.newFilePath,
                sourceFilePath: operation.filePath,
              },
            ]),
          };
        }
      }
    },
    async dispose(): Promise<void> {
      for (const client of clientCache.values()) {
        await client.dispose();
      }

      clientCache.clear();
    },
    name: "tsgo-lsp+native",
  };
}
