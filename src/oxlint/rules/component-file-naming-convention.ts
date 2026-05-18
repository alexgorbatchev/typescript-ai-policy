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
import {
  filenameStyleRuleSchema,
  readComponentFilePattern,
  readExpectedComponentNameFromFileStem,
  readFilenameStyle,
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

const componentFileNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require component ownership filenames to match their exported PascalCase component name, or multipart family root name, in the configured "ComponentName.tsx" or "component-name.tsx" form',
      guidance:
        'Name each component ownership file after its exported PascalCase component. Use "ComponentName.tsx" by default, or "component-name.tsx" when the shared config uses `FilenameStyle.DashCase`. For multipart component families, use the shared family root name.',
    },
    schema: filenameStyleRuleSchema,
    messages: {
      invalidComponentFileName:
        "Rename this file to the configured {{expectedComponentFilePattern}} basename that matches the exported component name.",
      invalidComponentExportName: "Rename this exported component to PascalCase.",
      mismatchedComponentFileName:
        "Rename this file or exported component so they match in the configured {{expectedComponentFilePattern}} form.",
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
    const expectedComponentFilePattern = readComponentFilePattern(filenameStyle);

    return {
      Program(node) {
        const exportedComponentEntry = readCanonicalRuntimeExportEntry(node);
        if (!exportedComponentEntry) {
          return;
        }

        const { name: exportedComponentName, reportNode } = exportedComponentEntry;
        const expectedComponentName = readExpectedComponentNameFromFileStem(
          getFilenameWithoutExtension(context.filename),
          filenameStyle,
        );
        if (!expectedComponentName) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "invalidComponentFileName",
            data: { expectedComponentFilePattern },
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

        context.report({
          node: reportNode,
          messageId: "mismatchedComponentFileName",
          data: { expectedComponentFilePattern },
        });
      },
    };
  },
};

export default componentFileNamingConventionRule;
