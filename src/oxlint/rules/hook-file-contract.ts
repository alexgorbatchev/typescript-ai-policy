import type {
  AstDeclarationWithIdentifiers,
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstNode,
  AstProgram,
  AstProgramStatement,
  RuleModule,
} from "./types.ts";
import {
  isExemptSupportBasename,
  isInStoriesDirectory,
  isInTestsDirectory,
  isTypeDeclaration,
  readPatternIdentifierNames,
  readProgramReportNode,
  readDefaultExportName,
} from "./helpers.ts";

type HookRuntimeExportEntry = {
  kind:
    | "class-declaration"
    | "const-variable"
    | "default-export"
    | "enum-declaration"
    | "export-all"
    | "function-declaration"
    | "indirect-export"
    | "variable-declaration";
  name?: string;
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

function readRuntimeExportEntries(program: AstProgram): HookRuntimeExportEntry[] {
  return program.body.flatMap((statement) => readStatementRuntimeExportEntries(statement));
}

function readStatementRuntimeExportEntries(statement: AstProgramStatement): HookRuntimeExportEntry[] {
  if (statement.type === "ExportDefaultDeclaration") {
    return [
      { kind: "default-export", name: readDefaultExportName(statement.declaration) ?? "default", node: statement },
    ];
  }

  if (statement.type === "TSExportAssignment") {
    return [{ kind: "default-export", name: "default", node: statement }];
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
        kind: "indirect-export" as const,
        name: readExportedSpecifierName(specifier),
        node: specifier,
      }));
  }

  return readDeclarationRuntimeExportEntries(statement.declaration);
}

function readDeclarationRuntimeExportEntries(declaration: AstDeclarationWithIdentifiers): HookRuntimeExportEntry[] {
  if (declaration.type === "FunctionDeclaration") {
    return declaration.id ? [{ kind: "function-declaration", name: declaration.id.name, node: declaration }] : [];
  }

  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) => {
      const declarationNames = readPatternIdentifierNames(declarator.id);

      return declarationNames.map((name) => ({
        kind: declaration.kind === "const" ? ("const-variable" as const) : ("variable-declaration" as const),
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

function isValidMainHookRuntimeExport(entry: HookRuntimeExportEntry): boolean {
  return entry.kind === "function-declaration" && entry.name?.startsWith("use") === true;
}

const hookFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require hook ownership files to export exactly one direct named hook function and allow only type-only secondary exports",
      guidance:
        "Use hook files only for the hook contract they own. Keep unrelated runtime exports and file roles out of hook ownership files.",
    },
    schema: [],
    messages: {
      missingMainHookExport:
        "Export exactly one direct named runtime hook from this file. Keep type-only exports separate from the ownership export.",
      invalidMainHookExport:
        "Export the main hook as a direct named function declaration. Do not wrap it or bind it to a const.",
      unexpectedAdditionalRuntimeExport:
        "Move this runtime export to its own ownership file. Keep each hook ownership file focused on one hook contract.",
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

        const validHookRuntimeExportEntries = rawRuntimeExportEntries.filter(isValidMainHookRuntimeExport);
        const validHookNames = validHookRuntimeExportEntries.map((entry) => entry.name);

        const runtimeExportEntries = rawRuntimeExportEntries.filter(
          (entry) => !(entry.kind === "default-export" && entry.name && validHookNames.includes(entry.name)),
        );

        if (runtimeExportEntries.length === 0) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "missingMainHookExport",
          });
          return;
        }

        const [mainRuntimeExportEntry, ...additionalRuntimeExportEntries] = runtimeExportEntries;
        if (!mainRuntimeExportEntry) {
          return;
        }

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
