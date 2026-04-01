import type { TSESTree } from "@typescript-eslint/types";
import type {
  AstDeclarationWithIdentifiers,
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstNode,
  AstProgram,
  AstProgramStatement,
  AstVariableDeclarator,
  RuleModule,
} from "./types.ts";
import {
  isExemptSupportBasename,
  isTypeDeclaration,
  readDeclarationIdentifierNames,
  readPatternIdentifierNames,
  unwrapExpression,
} from "./helpers.ts";

type WrappedFunctionExpressionState = TSESTree.FunctionExpression | false | null;

type ComponentRuntimeExportEntry = {
  declarationKind?: TSESTree.VariableDeclaration["kind"];
  declarator?: AstVariableDeclarator;
  kind:
    | "class-declaration"
    | "const-variable"
    | "default-export"
    | "enum-declaration"
    | "export-all"
    | "function-declaration"
    | "indirect-export"
    | "variable-declaration";
  name: string;
  node: AstNode;
};

function readExportedSpecifierName(specifier: AstExportSpecifier): string {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function isTypeOnlyExportSpecifier(
  specifier: AstExportSpecifier,
  exportDeclaration: AstExportNamedDeclaration,
): boolean {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

function isTypeOnlyExportNamedDeclaration(node: AstExportNamedDeclaration): boolean {
  if (node.declaration) {
    return node.exportKind === "type" || isTypeDeclaration(node.declaration);
  }

  return node.exportKind === "type" || node.specifiers.every((specifier) => isTypeOnlyExportSpecifier(specifier, node));
}

function readWrappedNamedFunctionExpression(
  initializer: TSESTree.Expression | null | undefined,
): TSESTree.FunctionExpression | null {
  if (!initializer) {
    return null;
  }

  const currentInitializer = unwrapExpression(initializer);
  if (currentInitializer.type === "FunctionExpression") {
    return currentInitializer;
  }

  if (currentInitializer.type !== "CallExpression") {
    return null;
  }

  let wrappedFunctionExpression: WrappedFunctionExpressionState = null;

  currentInitializer.arguments.forEach((argument) => {
    if (argument.type === "SpreadElement") {
      return;
    }

    const candidate = readWrappedNamedFunctionExpression(argument);
    if (!candidate) {
      return;
    }

    if (wrappedFunctionExpression) {
      wrappedFunctionExpression = false;
      return;
    }

    wrappedFunctionExpression = candidate;
  });

  return wrappedFunctionExpression || null;
}

function readRuntimeExportEntries(program: AstProgram): ComponentRuntimeExportEntry[] {
  return program.body.flatMap((statement) => readStatementRuntimeExportEntries(statement));
}

function readStatementRuntimeExportEntries(statement: AstProgramStatement): ComponentRuntimeExportEntry[] {
  if (statement.type === "ExportDefaultDeclaration") {
    return [
      {
        kind: "default-export",
        name: readDefaultExportName(statement.declaration) ?? "default",
        node: statement,
      },
    ];
  }

  if (statement.type === "TSExportAssignment") {
    return [{ kind: "default-export", name: "default", node: statement }];
  }

  if (statement.type === "ExportAllDeclaration") {
    if (statement.exportKind === "type") {
      return [];
    }

    return [{ kind: "export-all", name: "*", node: statement }];
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return [];
  }

  if (isTypeOnlyExportNamedDeclaration(statement)) {
    return [];
  }

  if (!statement.declaration) {
    return statement.specifiers
      .filter((specifier) => !isTypeOnlyExportSpecifier(specifier, statement))
      .map((specifier) => ({
        kind: "indirect-export" as const,
        name: readExportedSpecifierName(specifier),
        node: specifier,
      }));
  }

  return readDeclarationRuntimeExportEntries(statement.declaration);
}

function readDefaultExportName(declaration: TSESTree.ExportDefaultDeclaration["declaration"]): string | null {
  if (declaration.type === "Identifier") {
    return declaration.name;
  }

  if (declaration.type === "VariableDeclaration") {
    const firstDeclarator = declaration.declarations[0];
    return firstDeclarator?.id.type === "Identifier" ? firstDeclarator.id.name : null;
  }

  if (
    declaration.type === "FunctionDeclaration" ||
    declaration.type === "ClassDeclaration" ||
    declaration.type === "TSEnumDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSTypeAliasDeclaration"
  ) {
    return readDeclarationIdentifierNames(declaration)[0] ?? null;
  }

  return null;
}

function readDeclarationRuntimeExportEntries(
  declaration: AstDeclarationWithIdentifiers,
): ComponentRuntimeExportEntry[] {
  if (declaration.type === "FunctionDeclaration") {
    return declaration.id ? [{ kind: "function-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  if (declaration.type === "ClassDeclaration") {
    return declaration.id ? [{ kind: "class-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  if (declaration.type === "TSEnumDeclaration") {
    return declaration.id ? [{ kind: "enum-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  if (declaration.type !== "VariableDeclaration") {
    return [];
  }

  return declaration.declarations.flatMap((declarator) => {
    const declarationNames = readPatternIdentifierNames(declarator.id);

    return declarationNames.map((name) => ({
      declarationKind: declaration.kind,
      declarator,
      kind: declaration.kind === "const" ? ("const-variable" as const) : ("variable-declaration" as const),
      name,
      node: declarator,
    }));
  });
}

function isValidWrappedComponentExport(entry: ComponentRuntimeExportEntry): boolean {
  if (entry.kind !== "const-variable" || !entry.declarator) {
    return false;
  }

  if (entry.declarator.id.type !== "Identifier") {
    return false;
  }

  const wrappedFunctionExpression = readWrappedNamedFunctionExpression(entry.declarator.init);
  if (!wrappedFunctionExpression || !wrappedFunctionExpression.id) {
    return false;
  }

  return wrappedFunctionExpression.id.name === entry.name;
}

function isValidMainComponentRuntimeExport(entry: ComponentRuntimeExportEntry): boolean {
  return entry.kind === "function-declaration" || isValidWrappedComponentExport(entry);
}

const componentFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require direct-child component ownership files to export exactly one named runtime component and allow only type-only secondary exports",
    },
    schema: [],
    messages: {
      missingMainComponentExport:
        "Export exactly one main runtime component from this file. Component ownership files must use one direct named export plus optional type-only exports.",
      invalidMainComponentExport:
        "Replace this export with a valid component ownership export. Use `export function ComponentName() {}` for plain components, or `export const ComponentName = wrapper(function ComponentName() {})` for wrapped components.",
      unexpectedAdditionalRuntimeExport:
        "Remove this additional runtime export. Component ownership files may export only one main runtime component plus unrestricted type-only API.",
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const runtimeExportEntries = readRuntimeExportEntries(node);
        if (runtimeExportEntries.length === 0) {
          context.report({
            node,
            messageId: "missingMainComponentExport",
          });
          return;
        }

        const [mainRuntimeExportEntry, ...additionalRuntimeExportEntries] = runtimeExportEntries;
        if (!mainRuntimeExportEntry) {
          return;
        }

        if (!isValidMainComponentRuntimeExport(mainRuntimeExportEntry)) {
          context.report({
            node: mainRuntimeExportEntry.node,
            messageId: "invalidMainComponentExport",
          });
        }

        additionalRuntimeExportEntries.forEach((runtimeExportEntry) => {
          context.report({
            node: runtimeExportEntry.node,
            messageId: "unexpectedAdditionalRuntimeExport",
          });
        });
      },
    };
  },
};

export default componentFileContractRule;
