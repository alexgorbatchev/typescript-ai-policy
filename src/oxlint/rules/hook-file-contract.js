import { isExemptSupportBasename, isTypeDeclaration, readPatternIdentifierNames } from "./helpers.js";

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

function readRuntimeExportEntries(program) {
  return program.body.flatMap((statement) => readStatementRuntimeExportEntries(statement));
}

function readStatementRuntimeExportEntries(statement) {
  if (statement.type === "ExportDefaultDeclaration") {
    return [{ kind: "default-export", node: statement }];
  }

  if (statement.type === "TSExportAssignment") {
    return [{ kind: "default-export", node: statement }];
  }

  if (statement.type === "ExportAllDeclaration") {
    if (statement.exportKind === "type") {
      return [];
    }

    return [{ kind: "export-all", node: statement }];
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

  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) => {
      const declarationNames = readPatternIdentifierNames(declarator.id);

      return declarationNames.map((name) => ({
        kind: declaration.kind === "const" ? "const-variable" : "variable-declaration",
        name,
        node: declarator,
      }));
    });
  }

  if (declaration.type === "TSEnumDeclaration") {
    return declaration.id ? [{ kind: "enum-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  if (declaration.type === "ClassDeclaration") {
    return declaration.id ? [{ kind: "class-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  return [];
}

function isValidMainHookRuntimeExport(entry) {
  return entry.kind === "function-declaration" && entry.name?.startsWith("use") === true;
}

const hookFileContractRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        "Require hook ownership files to export exactly one direct named hook function and allow only type-only secondary exports",
    },
    schema: [],
    messages: {
      missingMainHookExport:
        "Export exactly one main runtime hook from this file. Hook ownership files must use one direct named `export function useThing()` export plus optional type-only exports.",
      invalidMainHookExport:
        "Replace this export with a plain named hook function declaration. Hook ownership files must use `export function useThing() {}` and must not wrap or const-bind the main hook export.",
      unexpectedAdditionalRuntimeExport:
        "Remove this additional runtime export. Hook ownership files may export only one main runtime hook plus unrestricted type-only API.",
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
            messageId: "missingMainHookExport",
          });
          return;
        }

        const [mainRuntimeExportEntry, ...additionalRuntimeExportEntries] = runtimeExportEntries;

        if (!isValidMainHookRuntimeExport(mainRuntimeExportEntry)) {
          context.report({
            node: mainRuntimeExportEntry.node,
            messageId: "invalidMainHookExport",
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

export default hookFileContractRule;
