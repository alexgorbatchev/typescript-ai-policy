import type {
  AstDeclarationWithIdentifiers,
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstProgram,
  AstProgramStatement,
  AstVariableDeclaration,
  AstVariableDeclarator,
  RuleModule,
} from "./types.ts";
import {
  getExtension,
  getFilenameWithoutExtension,
  isDirectChildOfAnyDirectory,
  isStrictAreaAllowedSupportFile,
  readDeclarationIdentifierNames,
  readPatternIdentifierNames,
} from "./helpers.ts";

const HOOK_DIRECTORY_NAMES = new Set(["hooks"]);
const ALLOWED_HOOK_EXTENSIONS = new Set([".ts", ".tsx"]);

type HookExportEntry = {
  exportedName: string;
  node: AstVariableDeclarator | AstDeclarationWithIdentifiers | AstExportSpecifier;
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

function readRuntimeHookExportEntries(program: AstProgram): HookExportEntry[] {
  return program.body.flatMap((statement) => readStatementRuntimeHookExportEntries(statement));
}

function readStatementRuntimeHookExportEntries(statement: AstProgramStatement): HookExportEntry[] {
  if (
    statement.type === "ExportAllDeclaration" ||
    statement.type === "ExportDefaultDeclaration" ||
    statement.type === "TSExportAssignment"
  ) {
    return [];
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return [];
  }

  if (statement.declaration) {
    if (
      statement.exportKind === "type" ||
      statement.declaration.type === "TSTypeAliasDeclaration" ||
      statement.declaration.type === "TSInterfaceDeclaration" ||
      statement.declaration.type === "TSModuleDeclaration"
    ) {
      return [];
    }

    return readDeclarationRuntimeHookExportEntries(statement.declaration);
  }

  return statement.specifiers
    .filter((specifier) => !isTypeOnlyExportSpecifier(specifier, statement))
    .map((specifier) => ({
      exportedName: readExportedSpecifierName(specifier),
      node: specifier,
    }))
    .filter((entry) => entry.exportedName.startsWith("use"));
}

function readDeclarationRuntimeHookExportEntries(declaration: AstDeclarationWithIdentifiers): HookExportEntry[] {
  if (declaration.type === "VariableDeclaration") {
    return readVariableDeclarationRuntimeHookExportEntries(declaration);
  }

  return readDeclarationIdentifierNames(declaration)
    .filter((name) => name.startsWith("use"))
    .map((name) => ({
      exportedName: name,
      node: declaration,
    }));
}

function readVariableDeclarationRuntimeHookExportEntries(declaration: AstVariableDeclaration): HookExportEntry[] {
  return declaration.declarations.flatMap((declarator) => {
    const declarationNames = readPatternIdentifierNames(declarator.id);

    return declarationNames
      .filter((name) => name.startsWith("use"))
      .map((name) => ({
        exportedName: name,
        node: declarator,
      }));
  });
}

function isCanonicalHookOwnershipFile(filename: string): boolean {
  if (isStrictAreaAllowedSupportFile(filename)) {
    return false;
  }

  if (!isDirectChildOfAnyDirectory(filename, HOOK_DIRECTORY_NAMES)) {
    return false;
  }

  return getFilenameWithoutExtension(filename).startsWith("use");
}

function readKebabCaseHookName(name: string): string {
  return name.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

const hookExportLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require exported runtime bindings whose name starts with "use" to live in direct-child "hooks/use*.ts" or "hooks/use*.tsx" ownership files',
    },
    schema: [],
    messages: {
      misplacedHookExport:
        'Move exported hook "{{ hookName }}" into a direct-child ownership file under a "hooks/" directory. Valid filenames are "hooks/{{ camelFilename }}" or "hooks/{{ kebabFilename }}".',
    },
  },
  create(context) {
    if (
      !ALLOWED_HOOK_EXTENSIONS.has(getExtension(context.filename)) ||
      isStrictAreaAllowedSupportFile(context.filename)
    ) {
      return {};
    }

    if (isCanonicalHookOwnershipFile(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        readRuntimeHookExportEntries(node).forEach((hookExportEntry) => {
          const extension = getExtension(context.filename) || ".ts";

          context.report({
            node: hookExportEntry.node,
            messageId: "misplacedHookExport",
            data: {
              hookName: hookExportEntry.exportedName,
              camelFilename: `${hookExportEntry.exportedName}${extension}`,
              kebabFilename: `${readKebabCaseHookName(hookExportEntry.exportedName)}${extension}`,
            },
          });
        });
      },
    };
  },
};

export default hookExportLocationConventionRule;
