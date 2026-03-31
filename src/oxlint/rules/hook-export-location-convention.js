import {
  getExtension,
  getFilenameWithoutExtension,
  isDirectChildOfAnyDirectory,
  isStrictAreaAllowedSupportFile,
  readDeclarationIdentifierNames,
  readPatternIdentifierNames,
} from "./helpers.js";

const HOOK_DIRECTORY_NAMES = new Set(["hooks"]);
const ALLOWED_HOOK_EXTENSIONS = new Set([".ts", ".tsx"]);

function readExportedSpecifierName(specifier) {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function isTypeOnlyExportSpecifier(specifier, exportDeclaration) {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

function readRuntimeHookExportEntries(program) {
  return program.body.flatMap((statement) => readStatementRuntimeHookExportEntries(statement));
}

function readStatementRuntimeHookExportEntries(statement) {
  if (statement.type === "ExportAllDeclaration" || statement.type === "ExportDefaultDeclaration") {
    return [];
  }

  if (statement.type === "TSExportAssignment") {
    return [];
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return [];
  }

  if (statement.declaration) {
    if (
      statement.exportKind === "type" ||
      statement.declaration.type === "TSTypeAliasDeclaration" ||
      statement.declaration.type === "TSInterfaceDeclaration"
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

function readDeclarationRuntimeHookExportEntries(declaration) {
  if (declaration.type === "VariableDeclaration") {
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

  return readDeclarationIdentifierNames(declaration)
    .filter((name) => name.startsWith("use"))
    .map((name) => ({
      exportedName: name,
      node: declaration,
    }));
}

function isCanonicalHookOwnershipFile(filename) {
  if (isStrictAreaAllowedSupportFile(filename)) {
    return false;
  }

  if (!isDirectChildOfAnyDirectory(filename, HOOK_DIRECTORY_NAMES)) {
    return false;
  }

  return getFilenameWithoutExtension(filename).startsWith("use");
}

function readKebabCaseHookName(name) {
  return name.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

const hookExportLocationConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
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
