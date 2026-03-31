import {
  isExemptSupportBasename,
  isTypeDeclaration,
  readDeclarationIdentifierNames,
  readPatternIdentifierNames,
  unwrapExpression,
} from "./helpers.js";

function readExportedSpecifierName(specifier) {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function isTypeOnlyExportSpecifier(specifier, exportDeclaration) {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

function isTypeOnlyExportNamedDeclaration(node) {
  if (node.declaration) {
    return node.exportKind === "type" || isTypeDeclaration(node.declaration);
  }

  return node.exportKind === "type" || node.specifiers.every((specifier) => isTypeOnlyExportSpecifier(specifier, node));
}

function readWrappedNamedFunctionExpression(initializer) {
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

  let wrappedFunctionExpression = null;

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

function readRuntimeExportEntries(program) {
  return program.body.flatMap((statement) => readStatementRuntimeExportEntries(statement));
}

function readStatementRuntimeExportEntries(statement) {
  if (statement.type === "ExportDefaultDeclaration") {
    return [
      {
        kind: "default-export",
        name: readDeclarationIdentifierNames(statement.declaration)[0] ?? "default",
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
        kind: "indirect-export",
        name: readExportedSpecifierName(specifier),
        node: specifier,
      }));
  }

  return readDeclarationRuntimeExportEntries(statement.declaration);
}

function readDeclarationRuntimeExportEntries(declaration) {
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
      kind: declaration.kind === "const" ? "const-variable" : "variable-declaration",
      name,
      node: declarator,
      declarationKind: declaration.kind,
      declarator,
    }));
  });
}

function isValidWrappedComponentExport(entry) {
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

function isValidMainComponentRuntimeExport(entry) {
  return entry.kind === "function-declaration" || isValidWrappedComponentExport(entry);
}

const componentFileContractRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
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
