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

function readKebabCaseHookFilename(hookName: string): string {
  return `${hookName.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase()}.ts`;
}

const hookFileNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require hook ownership filenames to match their exported hook name in either camelCase or kebab-case `use*` form",
    },
    schema: [],
    messages: {
      invalidHookFileName:
        'Rename this hook file to either "useFoo.ts[x]" or "use-foo.ts[x]" so its basename maps deterministically to the exported hook name.',
      invalidHookExportName:
        'Rename the exported hook to lower camelCase starting with "use". Hook ownership files must export names like "useFoo".',
      mismatchedHookFileName:
        'Rename this file or the exported hook so they match exactly. "{{ exportedName }}" must live in either "{{ camelFilename }}" or "{{ kebabFilename }}".',
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

        const extension = context.filename.endsWith(".tsx") ? ".tsx" : ".ts";

        context.report({
          node: reportNode,
          messageId: "mismatchedHookFileName",
          data: {
            exportedName: exportedHookName,
            camelFilename: `${exportedHookName}${extension}`,
            kebabFilename: readKebabCaseHookFilename(exportedHookName).replace(/\.ts$/u, extension),
          },
        });
      },
    };
  },
};

export default hookFileNamingConventionRule;
