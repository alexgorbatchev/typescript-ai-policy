import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { Identifier, Node, SourceFile } from "typescript";
import { readTypeScriptModule } from "../readTypeScriptModule.ts";
import type { OxlintDiagnostic, SemanticFixProviderContext, SymbolRenameOperation } from "../types.ts";

const ts = readTypeScriptModule();

type NamedDeclarationWithIdentifier = Node & {
  name: Identifier;
};

type NamedDeclarationMatcher<TDeclaration extends NamedDeclarationWithIdentifier> = (
  node: Node,
) => node is TDeclaration;

export function readAbsoluteDiagnosticFilePath(
  diagnostic: OxlintDiagnostic,
  context: SemanticFixProviderContext,
): string {
  if (isAbsolute(diagnostic.filename)) {
    return diagnostic.filename;
  }

  return resolve(context.targetDirectoryPath, diagnostic.filename);
}

export function readDiagnosticSourceFile(
  diagnostic: OxlintDiagnostic,
  context: SemanticFixProviderContext,
): SourceFile {
  const filePath = readAbsoluteDiagnosticFilePath(diagnostic, context);
  const content = readFileSync(filePath, "utf8");

  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

export function readOffsetFromLineAndColumn(sourceFile: SourceFile, line: number, column: number): number | null {
  if (line < 1 || column < 1) {
    return null;
  }

  try {
    return ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);
  } catch {
    return null;
  }
}

export function readNamedDeclarationAtOffset<TDeclaration extends NamedDeclarationWithIdentifier>(
  node: Node,
  offset: number,
  isMatchingDeclaration: NamedDeclarationMatcher<TDeclaration>,
): TDeclaration | null {
  if (isMatchingDeclaration(node)) {
    const declarationNameStart = node.name.getStart();
    const declarationNameEnd = node.name.getEnd();
    if (offset >= declarationNameStart && offset <= declarationNameEnd) {
      return node;
    }
  }

  let matchingDeclaration: TDeclaration | null = null;

  ts.forEachChild(node, (childNode) => {
    if (matchingDeclaration) {
      return;
    }

    matchingDeclaration = readNamedDeclarationAtOffset(childNode, offset, isMatchingDeclaration);
  });

  return matchingDeclaration;
}

export function readNamedDeclarationFromDiagnosticLabel<TDeclaration extends NamedDeclarationWithIdentifier>(
  sourceFile: SourceFile,
  label: OxlintDiagnostic["labels"][number],
  isMatchingDeclaration: NamedDeclarationMatcher<TDeclaration>,
): TDeclaration | null {
  const declarationAtReportedOffset = readNamedDeclarationAtOffset(
    sourceFile,
    label.span.offset,
    isMatchingDeclaration,
  );
  if (declarationAtReportedOffset) {
    return declarationAtReportedOffset;
  }

  const offsetFromLineAndColumn = readOffsetFromLineAndColumn(sourceFile, label.span.line, label.span.column);
  if (offsetFromLineAndColumn === null || offsetFromLineAndColumn === label.span.offset) {
    return null;
  }

  return readNamedDeclarationAtOffset(sourceFile, offsetFromLineAndColumn, isMatchingDeclaration);
}

export function readRenameSymbolOperation(
  diagnostic: OxlintDiagnostic,
  sourceFile: SourceFile,
  declarationName: Identifier,
  newName: string,
): SymbolRenameOperation {
  const filePath = sourceFile.fileName;
  const start = ts.getLineAndCharacterOfPosition(sourceFile, declarationName.getStart());
  const symbolName = declarationName.text;

  return {
    filePath,
    id: `${diagnostic.code}:${filePath}:${start.line}:${start.character}:${newName}`,
    kind: "rename-symbol",
    newName,
    position: {
      character: start.character,
      line: start.line,
    },
    ruleCode: diagnostic.code,
    symbolName,
  };
}
