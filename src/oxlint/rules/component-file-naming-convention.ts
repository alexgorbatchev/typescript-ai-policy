import type { TSESTree } from "@typescript-eslint/types";
import type {
  AstDeclarationWithIdentifiers,
  AstExportNamedDeclaration,
  AstExportSpecifier,
  AstProgram,
  AstProgramStatement,
  RuleModule,
} from "./types.ts";
import {
  getFilenameWithoutExtension,
  isExemptSupportBasename,
  isInStoriesDirectory,
  isInTestsDirectory,
  isPascalCase,
  readDeclarationIdentifierNames,
  readMultipartComponentRootName,
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

type RuntimeExportNameEntry = {
  name: string;
  reportNode: TSESTree.Node;
};

function readRuntimeExportNameEntries(program: AstProgram): RuntimeExportNameEntry[] {
  return program.body.flatMap((statement) => {
    const exportEntry = readStatementRuntimeExportEntry(statement);
    return exportEntry === null ? [] : [exportEntry];
  });
}

function readCanonicalRuntimeExportEntry(program: AstProgram): RuntimeExportNameEntry | null {
  const runtimeExportEntries = readRuntimeExportNameEntries(program);
  if (runtimeExportEntries.length === 0) {
    return null;
  }

  const multipartComponentRootName = readMultipartComponentRootName(
    runtimeExportEntries.map((runtimeExportEntry) => runtimeExportEntry.name),
  );

  if (!multipartComponentRootName) {
    return runtimeExportEntries[0] ?? null;
  }

  return (
    runtimeExportEntries.find((runtimeExportEntry) => runtimeExportEntry.name === multipartComponentRootName) ??
    runtimeExportEntries[0] ??
    null
  );
}

function readStatementRuntimeExportEntry(statement: AstProgramStatement): RuntimeExportNameEntry | null {
  if (statement.type === "ExportDefaultDeclaration") {
    return readDefaultExportEntry(statement.declaration);
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return null;
  }

  if (statement.declaration) {
    if (statement.exportKind === "type") {
      return null;
    }

    return readDeclarationRuntimeExportEntry(statement.declaration);
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

function readDefaultExportEntry(
  declaration: TSESTree.ExportDefaultDeclaration["declaration"],
): RuntimeExportNameEntry | null {
  if (declaration.type === "Identifier") {
    return {
      name: declaration.name,
      reportNode: declaration,
    };
  }

  if (
    declaration.type === "FunctionDeclaration" ||
    declaration.type === "ClassDeclaration" ||
    declaration.type === "TSEnumDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSTypeAliasDeclaration"
  ) {
    return declaration.id
      ? {
          name: declaration.id.name,
          reportNode: declaration.id,
        }
      : null;
  }

  if (declaration.type === "VariableDeclaration") {
    return readVariableDeclarationExportEntry(declaration);
  }

  return null;
}

function readDeclarationRuntimeExportEntry(declaration: AstDeclarationWithIdentifiers): RuntimeExportNameEntry | null {
  if (
    declaration.type === "TSTypeAliasDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSModuleDeclaration"
  ) {
    return null;
  }

  if (declaration.type === "VariableDeclaration") {
    return readVariableDeclarationExportEntry(declaration);
  }

  const declarationName = readDeclarationIdentifierNames(declaration)[0];
  if (!declarationName) {
    return null;
  }

  if (
    declaration.type === "FunctionDeclaration" ||
    declaration.type === "ClassDeclaration" ||
    declaration.type === "TSEnumDeclaration"
  ) {
    return declaration.id
      ? {
          name: declaration.id.name,
          reportNode: declaration.id,
        }
      : null;
  }

  return null;
}

function readVariableDeclarationExportEntry(declaration: TSESTree.VariableDeclaration): RuntimeExportNameEntry | null {
  const firstDeclarator = declaration.declarations[0];
  if (!firstDeclarator || firstDeclarator.id.type !== "Identifier") {
    return null;
  }

  return {
    name: firstDeclarator.id.name,
    reportNode: firstDeclarator.id,
  };
}

function readExpectedComponentNameFromFilename(filename: string): string | null {
  const fileStem = getFilenameWithoutExtension(filename);
  if (isPascalCase(fileStem)) {
    return fileStem;
  }

  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(fileStem)) {
    return null;
  }

  return fileStem
    .split("-")
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join("");
}

const componentFileNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require component ownership filenames to match their exported PascalCase component name, or multipart family root name, in either PascalCase or kebab-case form",
    },
    schema: [],
    messages: {
      invalidComponentFileName:
        'Rename this file so its basename can map deterministically to the exported component name. Use "ComponentName.tsx" or "component-name.tsx"; if this is not a component ownership file and does not need JSX syntax, rename it to a ".ts" file instead.',
      invalidComponentExportName:
        "Rename the exported component to PascalCase. Component ownership files must export a PascalCase component name.",
      mismatchedComponentFileName:
        'Rename this file or the exported component so they match exactly. "{{ exportedName }}" must live in either "{{ pascalFilename }}" or "{{ kebabFilename }}".',
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
        const exportedComponentEntry = readCanonicalRuntimeExportEntry(node);
        if (!exportedComponentEntry) {
          return;
        }

        const { name: exportedComponentName, reportNode } = exportedComponentEntry;
        const expectedComponentName = readExpectedComponentNameFromFilename(context.filename);
        if (!expectedComponentName) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "invalidComponentFileName",
          });
          return;
        }

        if (!isPascalCase(exportedComponentName)) {
          context.report({
            node: reportNode,
            messageId: "invalidComponentExportName",
          });
        }

        if (exportedComponentName === expectedComponentName) {
          return;
        }

        const kebabFilename = `${exportedComponentName.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase()}.tsx`;

        context.report({
          node: reportNode,
          messageId: "mismatchedComponentFileName",
          data: {
            exportedName: exportedComponentName,
            pascalFilename: `${exportedComponentName}.tsx`,
            kebabFilename,
          },
        });
      },
    };
  },
};

export default componentFileNamingConventionRule;
