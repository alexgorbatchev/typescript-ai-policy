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
