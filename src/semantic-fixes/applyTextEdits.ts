import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
import type { ITextEdit } from "./types.ts";

type IOffsetTextEdit = {
  endOffset: number;
  newText: string;
  startOffset: number;
};

type IFileEditEntry = {
  filePath: string;
  textEdits: readonly ITextEdit[];
};

function readFileEditEntries(textEdits: readonly ITextEdit[]): readonly IFileEditEntry[] {
  const textEditsByFilePath = new Map<string, ITextEdit[]>();

  for (const textEdit of textEdits) {
    const existingTextEdits = textEditsByFilePath.get(textEdit.filePath);
    if (existingTextEdits) {
      existingTextEdits.push(textEdit);
      continue;
    }

    textEditsByFilePath.set(textEdit.filePath, [textEdit]);
  }

  return [...textEditsByFilePath.entries()].map(([filePath, groupedTextEdits]) => ({
    filePath,
    textEdits: groupedTextEdits,
  }));
}

function compareOffsetTextEditsDescending(left: IOffsetTextEdit, right: IOffsetTextEdit): number {
  if (left.startOffset !== right.startOffset) {
    return right.startOffset - left.startOffset;
  }

  if (left.endOffset !== right.endOffset) {
    return right.endOffset - left.endOffset;
  }

  return right.newText.localeCompare(left.newText);
}

function readOffset(positionContent: string, line: number, character: number): number {
  const sourceFile = ts.createSourceFile("file.ts", positionContent, ts.ScriptTarget.Latest, true);
  return ts.getPositionOfLineAndCharacter(sourceFile, line, character);
}

function readOffsetTextEdit(content: string, textEdit: ITextEdit): IOffsetTextEdit {
  return {
    endOffset: readOffset(content, textEdit.end.line, textEdit.end.character),
    newText: textEdit.newText,
    startOffset: readOffset(content, textEdit.start.line, textEdit.start.character),
  };
}

function applyFileTextEdits(filePath: string, textEdits: readonly ITextEdit[]): void {
  const content = readFileSync(filePath, "utf8");
  const offsetTextEdits = textEdits
    .map((textEdit) => readOffsetTextEdit(content, textEdit))
    .sort(compareOffsetTextEditsDescending);

  let nextBlockedStartOffset = content.length + 1;
  let updatedContent = content;

  for (const offsetTextEdit of offsetTextEdits) {
    if (offsetTextEdit.endOffset > nextBlockedStartOffset) {
      throw new Error(`Overlapping semantic fix edits detected in ${filePath}`);
    }

    updatedContent =
      updatedContent.slice(0, offsetTextEdit.startOffset) +
      offsetTextEdit.newText +
      updatedContent.slice(offsetTextEdit.endOffset);
    nextBlockedStartOffset = offsetTextEdit.startOffset;
  }

  if (updatedContent !== content) {
    writeFileSync(filePath, updatedContent, "utf8");
  }
}

export function applyTextEdits(textEdits: readonly ITextEdit[]): readonly string[] {
  const changedFilePaths: string[] = [];

  for (const fileEditEntry of readFileEditEntries(textEdits)) {
    applyFileTextEdits(fileEditEntry.filePath, fileEditEntry.textEdits);
    changedFilePaths.push(fileEditEntry.filePath);
  }

  return changedFilePaths.sort((left, right) => left.localeCompare(right));
}
