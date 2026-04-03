import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import ts from "typescript";
import type {
  IOxlintDiagnostic,
  ISemanticFixOperation,
  ISemanticFixProvider,
  ISemanticFixProviderContext,
} from "../types.ts";

function readAbsoluteDiagnosticFilePath(diagnostic: IOxlintDiagnostic, context: ISemanticFixProviderContext): string {
  if (isAbsolute(diagnostic.filename)) {
    return diagnostic.filename;
  }

  return resolve(context.targetDirectoryPath, diagnostic.filename);
}

function readInterfaceDeclarationAtOffset(node: ts.Node, offset: number): ts.InterfaceDeclaration | null {
  if (ts.isInterfaceDeclaration(node)) {
    const start = node.name.getStart();
    const end = node.name.getEnd();
    if (offset >= start && offset <= end) {
      return node;
    }
  }

  let matchingDeclaration: ts.InterfaceDeclaration | null = null;

  ts.forEachChild(node, (childNode) => {
    if (matchingDeclaration) {
      return;
    }

    matchingDeclaration = readInterfaceDeclarationAtOffset(childNode, offset);
  });

  return matchingDeclaration;
}

function readNormalizedInterfaceName(interfaceName: string): string | null {
  const rawBaseName = /^[Ii]/.test(interfaceName) ? interfaceName.slice(1) : interfaceName;
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(rawBaseName)) {
    return null;
  }

  const normalizedBaseName = rawBaseName.charAt(0).toUpperCase() + rawBaseName.slice(1);
  const normalizedInterfaceName = `I${normalizedBaseName}`;

  if (normalizedInterfaceName === interfaceName) {
    return null;
  }

  return normalizedInterfaceName;
}

function readOperation(
  diagnostic: IOxlintDiagnostic,
  context: ISemanticFixProviderContext,
): ISemanticFixOperation | null {
  const label = diagnostic.labels[0];
  if (!label) {
    return null;
  }

  const filePath = readAbsoluteDiagnosticFilePath(diagnostic, context);
  const content = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const interfaceDeclaration = readInterfaceDeclarationAtOffset(sourceFile, label.span.offset);
  if (!interfaceDeclaration) {
    return null;
  }

  const symbolName = interfaceDeclaration.name.text;
  const newName = readNormalizedInterfaceName(symbolName);
  if (!newName) {
    return null;
  }

  const start = ts.getLineAndCharacterOfPosition(sourceFile, interfaceDeclaration.name.getStart());

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

export function createInterfaceNamingConventionSemanticFixProvider(): ISemanticFixProvider {
  return {
    createOperation(diagnostic, context): ISemanticFixOperation | null {
      return readOperation(diagnostic, context);
    },
    ruleCode: "@alexgorbatchev/interface-naming-convention",
  };
}
