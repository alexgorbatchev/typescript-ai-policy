import type {
  AstDeclarationWithIdentifiers,
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstProgram,
  AstProgramStatement,
  AstSourceLocationNode,
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
import {
  filenameStyleRuleSchema,
  isHookOwnershipFileStem,
  readFilenameStyle,
  readHookFilePattern,
} from "../filenameStyle.ts";

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

function isCanonicalHookOwnershipFile(filename: string, filenameStyle: ReturnType<typeof readFilenameStyle>): boolean {
  if (isStrictAreaAllowedSupportFile(filename)) {
    return false;
  }

  if (!isDirectChildOfAnyDirectory(filename, HOOK_DIRECTORY_NAMES)) {
    return false;
  }

  return isHookOwnershipFileStem(getFilenameWithoutExtension(filename), filenameStyle);
}

function readFirstLineReportLocation(node: AstSourceLocationNode, sourceLines: string[]): AstSourceLocationNode["loc"] {
  const nodeLocation = node.loc;

  if (nodeLocation.start.line === nodeLocation.end.line) {
    return nodeLocation;
  }

  const sourceLine = sourceLines[nodeLocation.start.line - 1];

  if (sourceLine === undefined) {
    return nodeLocation;
  }

  return {
    start: nodeLocation.start,
    end: {
      line: nodeLocation.start.line,
      column: sourceLine.length,
    },
  };
}

const hookExportLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require exported runtime bindings whose name starts with "use" to live in direct-child configured "hooks/useThing.ts{,x}" or "hooks/use-thing.ts{,x}" ownership files',
      guidance:
        'Export hooks from direct-child "hooks/useThing.ts{,x}" ownership files by default, or "hooks/use-thing.ts{,x}" when the shared config uses `FilenameStyle.DashCase`. Do not leak hook exports from unrelated modules.',
    },
    schema: filenameStyleRuleSchema,
    messages: {
      misplacedHookExport: 'Place exported hooks in direct-child "hooks/{{expectedHookFilePattern}}" files.',
    },
  },
  create(context) {
    const sourceLines = context.sourceCode.getLines();
    const filenameStyle = readFilenameStyle(context.options);
    const expectedHookFilePattern = readHookFilePattern(filenameStyle);

    if (
      !ALLOWED_HOOK_EXTENSIONS.has(getExtension(context.filename)) ||
      isStrictAreaAllowedSupportFile(context.filename)
    ) {
      return {};
    }

    if (isCanonicalHookOwnershipFile(context.filename, filenameStyle)) {
      return {};
    }

    return {
      Program(node) {
        readRuntimeHookExportEntries(node).forEach((hookExportEntry) => {
          context.report({
            loc: readFirstLineReportLocation(hookExportEntry.node, sourceLines),
            node: hookExportEntry.node,
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern },
          });
        });
      },
    };
  },
};

export default hookExportLocationConventionRule;
