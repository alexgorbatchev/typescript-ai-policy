import { fileURLToPath } from "node:url";
import { TsgoLspClient } from "./TsgoLspClient.ts";
import type {
  IApplySemanticFixesOptions,
  ISemanticFixBackend,
  ISemanticFixBackendContext,
  ISemanticFixOperation,
  ISemanticFixPlan,
  ISemanticFixPlanResult,
  ITextEdit,
} from "../../types.ts";

type ILspPosition = {
  character: number;
  line: number;
};

type ILspRange = {
  end: ILspPosition;
  start: ILspPosition;
};

type ILspTextEdit = {
  newText: string;
  range: ILspRange;
};

type ILspWorkspaceChanges = Record<string, readonly ILspTextEdit[]>;

type ILspWorkspaceEdit = {
  changes: ILspWorkspaceChanges;
};

type IClientCache = Map<string, TsgoLspClient>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLspPosition(value: unknown): value is ILspPosition {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.line === "number" && typeof value.character === "number";
}

function isLspRange(value: unknown): value is ILspRange {
  if (!isRecord(value)) {
    return false;
  }

  return isLspPosition(value.start) && isLspPosition(value.end);
}

function isLspTextEdit(value: unknown): value is ILspTextEdit {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.newText === "string" && isLspRange(value.range);
}

function isLspWorkspaceEdit(value: unknown): value is ILspWorkspaceEdit {
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

function compareTextEdit(left: ITextEdit, right: ITextEdit): number {
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

function readTextEdit(uri: string, textEdit: ILspTextEdit): ITextEdit {
  return {
    end: textEdit.range.end,
    filePath: fileURLToPath(uri),
    newText: textEdit.newText,
    start: textEdit.range.start,
  };
}

function readTextEdits(workspaceEdit: ILspWorkspaceEdit): readonly ITextEdit[] {
  const textEdits: ITextEdit[] = [];

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
  clientCache: IClientCache,
  context: ISemanticFixBackendContext,
  options: Pick<IApplySemanticFixesOptions, "tsgoExecutablePath">,
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

function readPlan(operation: ISemanticFixOperation, textEdits: readonly ITextEdit[]): ISemanticFixPlan {
  return {
    description: `Rename ${operation.symbolName} to ${operation.newName}`,
    operationId: operation.id,
    ruleCode: operation.ruleCode,
    textEdits,
  };
}

export function createTsgoLspSemanticFixBackend(
  options: Pick<IApplySemanticFixesOptions, "tsgoExecutablePath">,
): ISemanticFixBackend {
  const clientCache: IClientCache = new Map();

  return {
    async createPlan(operation, context): Promise<ISemanticFixPlanResult> {
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
      }
    },
    async dispose(): Promise<void> {
      for (const client of clientCache.values()) {
        await client.dispose();
      }

      clientCache.clear();
    },
    name: "tsgo-lsp",
  };
}
