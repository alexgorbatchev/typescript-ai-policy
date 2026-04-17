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

function readNormalizedTypeAliasName(typeAliasName: string): string | null {
  if (!/^I[A-Z][A-Za-z0-9]*$/u.test(typeAliasName)) {
    return null;
  }

  return typeAliasName.slice(1);
}

function readOperation(diagnostic: OxlintDiagnostic, context: SemanticFixProviderContext): SemanticFixOperation | null {
  const label = diagnostic.labels[0];
  if (!label) {
    return null;
  }

  const sourceFile = readDiagnosticSourceFile(diagnostic, context);
  const typeAliasDeclaration = readNamedDeclarationFromDiagnosticLabel(sourceFile, label, ts.isTypeAliasDeclaration);
  if (!typeAliasDeclaration) {
    return null;
  }

  const newName = readNormalizedTypeAliasName(typeAliasDeclaration.name.text);
  if (!newName) {
    return null;
  }

  return readRenameSymbolOperation(diagnostic, sourceFile, typeAliasDeclaration.name, newName);
}

export function createNoIPrefixedTypeAliasesSemanticFixProvider(): SemanticFixProvider {
  return {
    createOperation(diagnostic, context): SemanticFixOperation | null {
      return readOperation(diagnostic, context);
    },
    ruleCode: "@alexgorbatchev/no-i-prefixed-type-aliases",
  };
}
