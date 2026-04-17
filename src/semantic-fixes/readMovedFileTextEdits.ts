import { dirname, relative, resolve } from "node:path";
import { readFileSync } from "node:fs";
import type { ImportTypeNode, Node, SourceFile, StringLiteralLike } from "typescript";
import { readTypeScriptModule } from "./readTypeScriptModule.ts";
import type { TextEdit } from "./types.ts";

const ts = readTypeScriptModule();

function isRelativeModuleSpecifier(moduleSpecifier: string): boolean {
  return (
    moduleSpecifier === "." ||
    moduleSpecifier === ".." ||
    moduleSpecifier.startsWith("./") ||
    moduleSpecifier.startsWith("../")
  );
}

function normalizePathSlashes(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function readRelativeModuleSpecifier(fromDirectoryPath: string, targetPath: string): string {
  const relativePath = normalizePathSlashes(relative(fromDirectoryPath, targetPath));
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

type ModuleSpecifierEntry = {
  moduleSpecifier: string;
  node: StringLiteralLike;
};

function readImportTypeArgumentLiteral(node: ImportTypeNode): StringLiteralLike | null {
  if (!ts.isLiteralTypeNode(node.argument)) {
    return null;
  }

  return ts.isStringLiteralLike(node.argument.literal) ? node.argument.literal : null;
}

function readModuleSpecifierEntry(node: Node): ModuleSpecifierEntry | null {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)
      ? {
          moduleSpecifier: node.moduleSpecifier.text,
          node: node.moduleSpecifier,
        }
      : null;
  }

  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
    const expression = node.moduleReference.expression;
    return expression && ts.isStringLiteralLike(expression)
      ? {
          moduleSpecifier: expression.text,
          node: expression,
        }
      : null;
  }

  if (ts.isImportTypeNode(node)) {
    const argumentLiteral = readImportTypeArgumentLiteral(node);
    return argumentLiteral
      ? {
          moduleSpecifier: argumentLiteral.text,
          node: argumentLiteral,
        }
      : null;
  }

  if (ts.isCallExpression(node)) {
    const firstArgument = node.arguments[0];
    if (!firstArgument || !ts.isStringLiteralLike(firstArgument)) {
      return null;
    }

    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      return {
        moduleSpecifier: firstArgument.text,
        node: firstArgument,
      };
    }

    if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
      return {
        moduleSpecifier: firstArgument.text,
        node: firstArgument,
      };
    }
  }

  return null;
}

function readModuleSpecifierEntries(sourceFile: SourceFile): readonly ModuleSpecifierEntry[] {
  const moduleSpecifierEntries: ModuleSpecifierEntry[] = [];

  function visitNode(node: Node): void {
    const moduleSpecifierEntry = readModuleSpecifierEntry(node);
    if (moduleSpecifierEntry) {
      moduleSpecifierEntries.push(moduleSpecifierEntry);
    }

    ts.forEachChild(node, visitNode);
  }

  visitNode(sourceFile);

  return moduleSpecifierEntries;
}

export function readMovedFileTextEdits(sourceFilePath: string, destinationFilePath: string): readonly TextEdit[] {
  const content = readFileSync(sourceFilePath, "utf8");
  const sourceFile = ts.createSourceFile(sourceFilePath, content, ts.ScriptTarget.Latest, true);
  const sourceDirectoryPath = dirname(sourceFilePath);
  const destinationDirectoryPath = dirname(destinationFilePath);
  const textEdits: TextEdit[] = [];

  for (const moduleSpecifierEntry of readModuleSpecifierEntries(sourceFile)) {
    if (!isRelativeModuleSpecifier(moduleSpecifierEntry.moduleSpecifier)) {
      continue;
    }

    const resolvedImportTargetPath = resolve(sourceDirectoryPath, moduleSpecifierEntry.moduleSpecifier);
    const updatedModuleSpecifier = readRelativeModuleSpecifier(destinationDirectoryPath, resolvedImportTargetPath);
    if (updatedModuleSpecifier === moduleSpecifierEntry.moduleSpecifier) {
      continue;
    }

    const start = ts.getLineAndCharacterOfPosition(sourceFile, moduleSpecifierEntry.node.getStart(sourceFile) + 1);
    const end = ts.getLineAndCharacterOfPosition(sourceFile, moduleSpecifierEntry.node.getEnd() - 1);

    textEdits.push({
      end: {
        character: end.character,
        line: end.line,
      },
      filePath: sourceFilePath,
      newText: updatedModuleSpecifier,
      start: {
        character: start.character,
        line: start.line,
      },
    });
  }

  return textEdits.sort((left, right) => {
    if (left.start.line !== right.start.line) {
      return left.start.line - right.start.line;
    }

    return left.start.character - right.start.character;
  });
}
