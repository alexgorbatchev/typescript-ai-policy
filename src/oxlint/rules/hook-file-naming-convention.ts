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

function readExpectedHookNameFromFilename(filename: string): string | null {
  const fileStem = getFilenameWithoutExtension(filename);
  if (/^use[A-Z][A-Za-z0-9]*$/u.test(fileStem)) {
    return fileStem;
  }

  if (!/^use(?:-[a-z0-9]+)+$/u.test(fileStem)) {
    return null;
  }

  const [, ...segments] = fileStem.split("-");

  return `use${segments.map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`).join("")}`;
}

const hookFileNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require hook ownership filenames to match their exported hook name in either camelCase or kebab-case `use*` form",
      guidance:
        "Name hook files after the exported hook using the `use...` contract. Do not use filenames that hide or contradict hook ownership.",
    },
    schema: [],
    messages: {
      invalidHookFileName: 'Rename this hook file to "use*.ts{,x}".',
      invalidHookExportName: 'Rename this exported hook to start with "use" and use camelCase.',
      mismatchedHookFileName: "Rename this file or exported hook so they match exactly.",
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
        const exportedHookEntry = readFirstRuntimeExportEntry(node);
        if (!exportedHookEntry) {
          return;
        }

        const { name: exportedHookName, reportNode } = exportedHookEntry;
        const expectedHookName = readExpectedHookNameFromFilename(context.filename);
        if (!expectedHookName) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "invalidHookFileName",
          });
          return;
        }

        if (!/^use[A-Z][A-Za-z0-9]*$/u.test(exportedHookName)) {
          context.report({
            node: reportNode,
            messageId: "invalidHookExportName",
          });
        }

        if (exportedHookName === expectedHookName) {
          return;
        }

        context.report({
          node: reportNode,
          messageId: "mismatchedHookFileName",
        });
      },
    };
  },
};

export default hookFileNamingConventionRule;
