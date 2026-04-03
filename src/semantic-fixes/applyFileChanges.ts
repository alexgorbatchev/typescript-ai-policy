import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { applyTextEdits, readUpdatedContent } from "./applyTextEdits.ts";
import type { FileMove, TextEdit } from "./types.ts";

function readTextEditsByFilePath(textEdits: readonly TextEdit[]): Map<string, readonly TextEdit[]> {
  const textEditsByFilePath = new Map<string, TextEdit[]>();

  for (const textEdit of textEdits) {
    const existingTextEdits = textEditsByFilePath.get(textEdit.filePath);
    if (existingTextEdits) {
      existingTextEdits.push(textEdit);
      continue;
    }

    textEditsByFilePath.set(textEdit.filePath, [textEdit]);
  }

  return new Map(textEditsByFilePath);
}

function assertMoveFileOperationsAreSafe(fileMoves: readonly FileMove[]): void {
  const sourceFilePathSet = new Set<string>();
  const destinationFilePathSet = new Set<string>();

  for (const fileMove of fileMoves) {
    if (fileMove.sourceFilePath === fileMove.destinationFilePath) {
      throw new Error(`Refusing to move a file onto itself: ${fileMove.sourceFilePath}`);
    }

    if (sourceFilePathSet.has(fileMove.sourceFilePath)) {
      throw new Error(`Duplicate semantic fix move source detected: ${fileMove.sourceFilePath}`);
    }

    if (destinationFilePathSet.has(fileMove.destinationFilePath)) {
      throw new Error(`Duplicate semantic fix move destination detected: ${fileMove.destinationFilePath}`);
    }

    sourceFilePathSet.add(fileMove.sourceFilePath);
    destinationFilePathSet.add(fileMove.destinationFilePath);
  }
}

function applyMovedFile(fileMove: FileMove, textEdits: readonly TextEdit[]): void {
  if (!existsSync(fileMove.sourceFilePath)) {
    throw new Error(`Cannot move a missing file: ${fileMove.sourceFilePath}`);
  }

  if (existsSync(fileMove.destinationFilePath)) {
    throw new Error(`Refusing to overwrite an existing file: ${fileMove.destinationFilePath}`);
  }

  const content = readFileSync(fileMove.sourceFilePath, "utf8");
  const updatedContent = readUpdatedContent(fileMove.sourceFilePath, content, textEdits);

  mkdirSync(dirname(fileMove.destinationFilePath), { recursive: true });
  writeFileSync(fileMove.destinationFilePath, updatedContent, "utf8");
  rmSync(fileMove.sourceFilePath);
}

export function applyFileChanges(textEdits: readonly TextEdit[], fileMoves: readonly FileMove[]): readonly string[] {
  assertMoveFileOperationsAreSafe(fileMoves);

  const changedFilePathSet = new Set<string>();
  const textEditsByFilePath = readTextEditsByFilePath(textEdits);

  for (const fileMove of [...fileMoves].sort((left, right) =>
    left.sourceFilePath.localeCompare(right.sourceFilePath),
  )) {
    applyMovedFile(fileMove, textEditsByFilePath.get(fileMove.sourceFilePath) ?? []);
    textEditsByFilePath.delete(fileMove.sourceFilePath);
    changedFilePathSet.add(fileMove.destinationFilePath);
  }

  const remainingTextEdits = [...textEditsByFilePath.values()].flat();
  for (const changedFilePath of applyTextEdits(remainingTextEdits)) {
    changedFilePathSet.add(changedFilePath);
  }

  return [...changedFilePathSet].sort((left, right) => left.localeCompare(right));
}
