import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeProjectRelativePath } from "./normalizeProjectRelativePath.ts";
import { readLineAndCharacterFromOffset } from "./readLineAndCharacterFromOffset.ts";
import { TsgoLspClient } from "./TsgoLspClient.ts";
import type { ILineAndCharacter, IRenameBackendResult, IRenameEdit } from "./types.ts";

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

function compareRenameEdit(left: IRenameEdit, right: IRenameEdit): number {
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

function readRenameEdit(projectPath: string, uri: string, textEdit: ILspTextEdit): IRenameEdit {
  const filePath = fileURLToPath(uri);

  return {
    end: textEdit.range.end,
    filePath: normalizeProjectRelativePath(projectPath, filePath),
    newText: textEdit.newText,
    start: textEdit.range.start,
  };
}

function readRenameEdits(projectPath: string, workspaceEdit: ILspWorkspaceEdit): readonly IRenameEdit[] {
  const renameEdits: IRenameEdit[] = [];

  for (const [uri, textEdits] of Object.entries(workspaceEdit.changes)) {
    for (const textEdit of textEdits) {
      renameEdits.push(readRenameEdit(projectPath, uri, textEdit));
    }
  }

  return renameEdits.sort(compareRenameEdit);
}

function readFailureReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function readTsgoRenameResult(
  projectPath: string,
  targetFilePath: string,
  targetOffset: number,
  newName: string,
  tsgoExecutablePath: string,
): Promise<IRenameBackendResult> {
  const targetContent = readFileSync(targetFilePath, "utf8");
  const position: ILineAndCharacter = readLineAndCharacterFromOffset(targetContent, targetOffset);
  const client = new TsgoLspClient({
    tsgoExecutablePath,
    workspacePath: projectPath,
  });

  try {
    await client.initialize();

    try {
      await client.prepareRename(targetFilePath, position);
    } catch (error) {
      return {
        backendName: "tsgo-lsp",
        canRename: false,
        edits: [],
        failureReason: readFailureReason(error),
      };
    }

    const renameResult = await client.rename(targetFilePath, position, newName);
    if (renameResult === null) {
      return {
        backendName: "tsgo-lsp",
        canRename: true,
        edits: [],
        failureReason: null,
      };
    }

    if (!isLspWorkspaceEdit(renameResult)) {
      throw new Error(`Unexpected tsgo rename response: ${JSON.stringify(renameResult)}`);
    }

    return {
      backendName: "tsgo-lsp",
      canRename: true,
      edits: readRenameEdits(projectPath, renameResult),
      failureReason: null,
    };
  } finally {
    await client.dispose();
  }
}
