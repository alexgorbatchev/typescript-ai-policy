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
  isInStoriesDirectory,
  isInTestsDirectory,
  isTypeDeclaration,
  readProgramReportNode,
  readMultipartComponentRootName,
  readPatternIdentifierNames,
  readDefaultExportName,
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
  reportNode: AstNode;
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
        reportNode: statement,
      },
    ];
  }

  if (statement.type === "TSExportAssignment") {
    return [{ kind: "default-export", name: "default", node: statement, reportNode: statement }];
  }

  if (statement.type === "ExportAllDeclaration") {
    if (statement.exportKind === "type") {
      return [];
    }

    return [{ kind: "export-all", name: "*", node: statement, reportNode: statement }];
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
        reportNode: specifier.exported.type === "Identifier" ? specifier.exported : specifier,
      }));
  }

  return readDeclarationRuntimeExportEntries(statement.declaration);
}

function readDeclarationRuntimeExportEntries(
  declaration: AstDeclarationWithIdentifiers,
): ComponentRuntimeExportEntry[] {
  if (declaration.type === "FunctionDeclaration") {
    return declaration.id
      ? [{ kind: "function-declaration", name: declaration.id.name, node: declaration, reportNode: declaration.id }]
      : [];
  }

  if (declaration.type === "ClassDeclaration") {
    return declaration.id
      ? [{ kind: "class-declaration", name: declaration.id.name, node: declaration, reportNode: declaration.id }]
      : [];
  }

  if (declaration.type === "TSEnumDeclaration") {
    return declaration.id
      ? [{ kind: "enum-declaration", name: declaration.id.name, node: declaration, reportNode: declaration.id }]
      : [];
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
      reportNode: declarator.id.type === "Identifier" ? declarator.id : declarator,
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

function isValidMultipartComponentRuntimeExportFamily(
  runtimeExportEntries: readonly ComponentRuntimeExportEntry[],
): boolean {
  if (runtimeExportEntries.length < 2) {
    return false;
  }

  const validComponentRuntimeExportEntries = runtimeExportEntries.filter(isValidMainComponentRuntimeExport);
  if (validComponentRuntimeExportEntries.length !== runtimeExportEntries.length) {
    return false;
  }

  const multipartComponentRootName = readMultipartComponentRootName(
    validComponentRuntimeExportEntries.map((runtimeExportEntry) => runtimeExportEntry.name),
  );

  return multipartComponentRootName !== null;
}

const componentFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require component ownership files to export exactly one named runtime component or one multipart component family and allow only type-only secondary exports",
    },
    schema: [],
    messages: {
      missingMainComponentExport:
        "Export exactly one main runtime component from this file. Component ownership files must use one direct named export plus optional type-only exports.",
      invalidMainComponentExport:
        "Replace this export with a valid component ownership export. Use `export function ComponentName() {}` for plain components, or `export const ComponentName = wrapper(function ComponentName() {})` for wrapped components.",
      invalidIndirectComponentExport:
        "Export this component directly from its declaration. Component ownership files must use `export function ComponentName() {}` or a direct named wrapped `export const` binding, not an `export { ComponentName }` list.",
      unexpectedAdditionalRuntimeExport:
        "Extract this runtime export to its own ownership file. Component ownership files may export only one main runtime component, or one multipart component family whose members share the base component name, plus unrestricted type-only API.",
    },
  },
  create(context) {
    if (
      isExemptSupportBasename(context.filename) ||
      isInStoriesDirectory(context.filename) ||
      isInTestsDirectory(context.filename)
    ) {
      return {};
    }

    return {
      Program(node) {
        const rawRuntimeExportEntries = readRuntimeExportEntries(node);

        const validComponentRuntimeExportEntries = rawRuntimeExportEntries.filter(isValidMainComponentRuntimeExport);
        const validComponentNames = validComponentRuntimeExportEntries.map((entry) => entry.name);

        const runtimeExportEntries = rawRuntimeExportEntries.filter(
          (entry) => !(entry.kind === "default-export" && validComponentNames.includes(entry.name)),
        );

        if (runtimeExportEntries.length === 0) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "missingMainComponentExport",
          });
          return;
        }

        if (isValidMultipartComponentRuntimeExportFamily(runtimeExportEntries)) {
          return;
        }

        const [mainRuntimeExportEntry, ...additionalRuntimeExportEntries] = runtimeExportEntries;
        if (!mainRuntimeExportEntry) {
          return;
        }

        if (!isValidMainComponentRuntimeExport(mainRuntimeExportEntry)) {
          context.report({
            node: mainRuntimeExportEntry.reportNode,
            messageId:
              mainRuntimeExportEntry.kind === "indirect-export"
                ? "invalidIndirectComponentExport"
                : "invalidMainComponentExport",
          });
        }

        additionalRuntimeExportEntries.forEach((runtimeExportEntry) => {
          context.report({
            node: runtimeExportEntry.reportNode,
            messageId:
              runtimeExportEntry.kind === "indirect-export"
                ? "invalidIndirectComponentExport"
                : "unexpectedAdditionalRuntimeExport",
          });
        });
      },
    };
  },
};

export default componentFileContractRule;
