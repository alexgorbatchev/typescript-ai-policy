import type {
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstNode,
  AstProgram,
  AstProgramStatement,
  RuleModule,
} from "./types.ts";
import {
  getFilenameWithoutExtension,
  isExemptSupportBasename,
  isInStoriesDirectory,
  isInTestsDirectory,
  readDeclarationIdentifierNames,
  readProgramReportNode,
} from "./helpers.ts";
import {
  filenameStyleRuleSchema,
  readFilenameStyle,
  readExpectedHookNameFromFileStem,
  readHookExportPattern,
  readHookFilePattern,
} from "../filenameStyle.ts";

function isTypeOnlyExportSpecifier(
  specifier: AstExportSpecifier,
  exportDeclaration: AstExportNamedDeclaration,
): boolean {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

function readExportedSpecifierName(specifier: AstExportSpecifier): string {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

type HookRuntimeExportEntry = {
  name: string;
  reportNode: AstNode;
};

function readFirstRuntimeExportEntry(program: AstProgram): HookRuntimeExportEntry | null {
  for (const statement of program.body) {
    const exportEntry = readStatementRuntimeExportEntry(statement);
    if (exportEntry !== null) {
      return exportEntry;
    }
  }

  return null;
}

function readStatementRuntimeExportEntry(statement: AstProgramStatement): HookRuntimeExportEntry | null {
  if (statement.type !== "ExportNamedDeclaration") {
    return null;
  }

  if (statement.declaration) {
    if (
      statement.exportKind === "type" ||
      statement.declaration.type === "TSTypeAliasDeclaration" ||
      statement.declaration.type === "TSInterfaceDeclaration" ||
      statement.declaration.type === "TSModuleDeclaration"
    ) {
      return null;
    }

    if (statement.declaration.type === "VariableDeclaration") {
      const firstDeclarator = statement.declaration.declarations[0];
      if (!firstDeclarator || firstDeclarator.id.type !== "Identifier") {
        return null;
      }

      return {
        name: firstDeclarator.id.name,
        reportNode: firstDeclarator.id,
      };
    }

    const declarationName = readDeclarationIdentifierNames(statement.declaration)[0];
    if (!declarationName) {
      return null;
    }

    const reportNode =
      "id" in statement.declaration && statement.declaration.id ? statement.declaration.id : statement.declaration;

    return {
      name: declarationName,
      reportNode,
    };
  }

  const runtimeSpecifier = statement.specifiers.find((specifier) => !isTypeOnlyExportSpecifier(specifier, statement));
  if (!runtimeSpecifier) {
    return null;
  }

  return {
    name: readExportedSpecifierName(runtimeSpecifier),
    reportNode: runtimeSpecifier.exported.type === "Identifier" ? runtimeSpecifier.exported : runtimeSpecifier,
  };
}

const hookFileNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require hook ownership filenames to match their exported hook name in the configured "useThing.ts{,x}" or "use-thing.ts{,x}" form',
      guidance:
        'Name hook files after the exported hook using the `use...` contract. Use "useThing.ts{,x}" by default, or "use-thing.ts{,x}" when the shared config uses `FilenameStyle.DashCase`. Do not use filenames that hide or contradict hook ownership.',
    },
    schema: filenameStyleRuleSchema,
    messages: {
      invalidHookFileName: "Rename this hook file to the configured {{expectedHookFilePattern}} form.",
      invalidHookExportName: "Rename this exported hook to the {{expectedHookExportPattern}} form.",
      mismatchedHookFileName:
        "Rename this file or exported hook so they match in the configured {{expectedHookFilePattern}} / {{expectedHookExportPattern}} form.",
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

    const filenameStyle = readFilenameStyle(context.options);
    const expectedHookExportPattern = readHookExportPattern();
    const expectedHookFilePattern = readHookFilePattern(filenameStyle);

    return {
      Program(node) {
        const exportedHookEntry = readFirstRuntimeExportEntry(node);
        if (!exportedHookEntry) {
          return;
        }

        const { name: exportedHookName, reportNode } = exportedHookEntry;
        const expectedHookName = readExpectedHookNameFromFileStem(
          getFilenameWithoutExtension(context.filename),
          filenameStyle,
        );
        if (!expectedHookName) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "invalidHookFileName",
            data: { expectedHookFilePattern },
          });
          return;
        }

        if (!/^use[A-Z][A-Za-z0-9]*$/u.test(exportedHookName)) {
          context.report({
            node: reportNode,
            messageId: "invalidHookExportName",
            data: { expectedHookExportPattern },
          });
        }

        if (exportedHookName === expectedHookName) {
          return;
        }

        context.report({
          node: reportNode,
          messageId: "mismatchedHookFileName",
          data: { expectedHookExportPattern, expectedHookFilePattern },
        });
      },
    };
  },
};

export default hookFileNamingConventionRule;
