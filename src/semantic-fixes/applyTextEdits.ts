import { readFileSync, writeFileSync } from "node:fs";
import { readTypeScriptModule } from "./readTypeScriptModule.ts";
import type { TextEdit } from "./types.ts";

type OffsetTextEdit = {
  endOffset: number;
  newText: string;
  startOffset: number;
};

type FileEditEntry = {
  filePath: string;
  textEdits: readonly TextEdit[];
};

function readFileEditEntries(textEdits: readonly TextEdit[]): readonly FileEditEntry[] {
  const textEditsByFilePath = new Map<string, TextEdit[]>();

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

function compareOffsetTextEditsAscending(left: OffsetTextEdit, right: OffsetTextEdit): number {
  if (left.startOffset !== right.startOffset) {
    return left.startOffset - right.startOffset;
  }

  if (left.endOffset !== right.endOffset) {
    return left.endOffset - right.endOffset;
  }

  return left.newText.localeCompare(right.newText);
}

function compareOffsetTextEditsDescending(left: OffsetTextEdit, right: OffsetTextEdit): number {
  return compareOffsetTextEditsAscending(right, left);
}

function readOffset(positionContent: string, line: number, character: number): number {
  const ts = readTypeScriptModule();
  const sourceFile = ts.createSourceFile("file.ts", positionContent, ts.ScriptTarget.Latest, true);
  return ts.getPositionOfLineAndCharacter(sourceFile, line, character);
}

function readOffsetTextEdit(content: string, textEdit: TextEdit): OffsetTextEdit {
  return {
    endOffset: readOffset(content, textEdit.end.line, textEdit.end.character),
    newText: textEdit.newText,
    startOffset: readOffset(content, textEdit.start.line, textEdit.start.character),
  };
}

function haveSameRange(left: OffsetTextEdit, right: OffsetTextEdit): boolean {
  return left.startOffset === right.startOffset && left.endOffset === right.endOffset;
}

function isInsertion(edit: OffsetTextEdit): boolean {
  return edit.startOffset === edit.endOffset;
}

function haveSameInsertionPoint(left: OffsetTextEdit, right: OffsetTextEdit): boolean {
  return isInsertion(left) && isInsertion(right) && left.startOffset === right.startOffset;
}

function rangesOverlap(left: OffsetTextEdit, right: OffsetTextEdit): boolean {
  return left.startOffset < right.endOffset && right.startOffset < left.endOffset;
}

function containsRange(container: OffsetTextEdit, candidate: OffsetTextEdit): boolean {
  return container.startOffset <= candidate.startOffset && container.endOffset >= candidate.endOffset;
}

function readNormalizedOffsetTextEdits(
  filePath: string,
  offsetTextEdits: readonly OffsetTextEdit[],
): readonly OffsetTextEdit[] {
  const normalizedOffsetTextEdits: OffsetTextEdit[] = [];

  for (const offsetTextEdit of [...offsetTextEdits].sort(compareOffsetTextEditsAscending)) {
    const previousOffsetTextEdit = normalizedOffsetTextEdits.at(-1);
    if (!previousOffsetTextEdit) {
      normalizedOffsetTextEdits.push(offsetTextEdit);
      continue;
    }

    const sharesRange = haveSameRange(previousOffsetTextEdit, offsetTextEdit);
    const sharesInsertionPoint = haveSameInsertionPoint(previousOffsetTextEdit, offsetTextEdit);
    const overlapsPreviousRange = rangesOverlap(previousOffsetTextEdit, offsetTextEdit);
    const hasSameReplacement = previousOffsetTextEdit.newText === offsetTextEdit.newText;

    if (!sharesRange && !sharesInsertionPoint && !overlapsPreviousRange) {
      normalizedOffsetTextEdits.push(offsetTextEdit);
      continue;
    }

    if (hasSameReplacement && (sharesRange || sharesInsertionPoint)) {
      continue;
    }

    if (hasSameReplacement && containsRange(offsetTextEdit, previousOffsetTextEdit)) {
      continue;
    }

    if (hasSameReplacement && containsRange(previousOffsetTextEdit, offsetTextEdit)) {
      normalizedOffsetTextEdits[normalizedOffsetTextEdits.length - 1] = offsetTextEdit;
      continue;
    }

    throw new Error(`Overlapping semantic fix edits detected in ${filePath}`);
  }

  return normalizedOffsetTextEdits;
}

export function readUpdatedContent(filePath: string, content: string, textEdits: readonly TextEdit[]): string {
  const offsetTextEdits = [
    ...readNormalizedOffsetTextEdits(
      filePath,
      textEdits.map((textEdit) => readOffsetTextEdit(content, textEdit)),
    ),
  ].sort(compareOffsetTextEditsDescending);

  let updatedContent = content;

  for (const offsetTextEdit of offsetTextEdits) {
    updatedContent =
      updatedContent.slice(0, offsetTextEdit.startOffset) +
      offsetTextEdit.newText +
      updatedContent.slice(offsetTextEdit.endOffset);
  }

  return updatedContent;
}

function applyFileTextEdits(filePath: string, textEdits: readonly TextEdit[]): void {
  const content = readFileSync(filePath, "utf8");
  const updatedContent = readUpdatedContent(filePath, content, textEdits);

  if (updatedContent !== content) {
    writeFileSync(filePath, updatedContent, "utf8");
  }
}

export function applyTextEdits(textEdits: readonly TextEdit[]): readonly string[] {
  const changedFilePaths: string[] = [];

  for (const fileEditEntry of readFileEditEntries(textEdits)) {
    applyFileTextEdits(fileEditEntry.filePath, fileEditEntry.textEdits);
    changedFilePaths.push(fileEditEntry.filePath);
  }

  return changedFilePaths.sort((left, right) => left.localeCompare(right));
}
