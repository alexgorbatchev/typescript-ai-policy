import { readTypeScriptModule } from "../readTypeScriptModule.ts";
import type {
  OxlintDiagnostic,
  SemanticFixOperation,
  SemanticFixProvider,
  SemanticFixProviderContext,
} from "../types.ts";
import {
  readDiagnosticSourceFile,
  readNamedDeclarationFromDiagnosticLabel,
  readRenameSymbolOperation,
} from "./helpers.ts";

const ts = readTypeScriptModule();

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

function readOperation(diagnostic: OxlintDiagnostic, context: SemanticFixProviderContext): SemanticFixOperation | null {
  const label = diagnostic.labels[0];
  if (!label) {
    return null;
  }

  const sourceFile = readDiagnosticSourceFile(diagnostic, context);
  const interfaceDeclaration = readNamedDeclarationFromDiagnosticLabel(sourceFile, label, ts.isInterfaceDeclaration);
  if (!interfaceDeclaration) {
    return null;
  }

  const symbolName = interfaceDeclaration.name.text;
  const newName = readNormalizedInterfaceName(symbolName);
  if (!newName) {
    return null;
  }

  return readRenameSymbolOperation(diagnostic, sourceFile, interfaceDeclaration.name, newName);
}

export function createInterfaceNamingConventionSemanticFixProvider(): SemanticFixProvider {
  return {
    createOperation(diagnostic, context): SemanticFixOperation | null {
      return readOperation(diagnostic, context);
    },
    ruleCode: "@alexgorbatchev/interface-naming-convention",
  };
}
