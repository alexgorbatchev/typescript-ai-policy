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
  isPascalCase,
  readDeclarationIdentifierNames,
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

function readFirstRuntimeExportName(program: AstProgram): string | null {
  for (const statement of program.body) {
    const exportName = readStatementRuntimeExportName(statement);
    if (exportName !== null) {
      return exportName;
    }
  }

  return null;
}

function readStatementRuntimeExportName(statement: AstProgramStatement): string | null {
  if (statement.type === "ExportDefaultDeclaration") {
    return readDefaultExportName(statement.declaration);
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return null;
  }

  if (statement.declaration) {
    if (statement.exportKind === "type") {
      return null;
    }

    return readDeclarationRuntimeExportName(statement.declaration);
  }

  const runtimeSpecifier = statement.specifiers.find((specifier) => !isTypeOnlyExportSpecifier(specifier, statement));
  if (!runtimeSpecifier) {
    return null;
  }

  return readExportedSpecifierName(runtimeSpecifier);
}

function readDefaultExportName(declaration: TSESTree.ExportDefaultDeclaration["declaration"]): string | null {
  if (declaration.type === "Identifier") {
    return declaration.name;
  }

  if (
    declaration.type === "FunctionDeclaration" ||
    declaration.type === "ClassDeclaration" ||
    declaration.type === "TSEnumDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSTypeAliasDeclaration"
  ) {
    return declaration.id?.name ?? null;
  }

  if (declaration.type === "VariableDeclaration") {
    return readVariableDeclarationExportName(declaration);
  }

  return null;
}

function readDeclarationRuntimeExportName(declaration: AstDeclarationWithIdentifiers): string | null {
  if (
    declaration.type === "TSTypeAliasDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSModuleDeclaration"
  ) {
    return null;
  }

  if (declaration.type === "VariableDeclaration") {
    return readVariableDeclarationExportName(declaration);
  }

  return readDeclarationIdentifierNames(declaration)[0] ?? null;
}

function readVariableDeclarationExportName(declaration: TSESTree.VariableDeclaration): string | null {
  const firstDeclarator = declaration.declarations[0];
  if (!firstDeclarator || firstDeclarator.id.type !== "Identifier") {
    return null;
  }

  return firstDeclarator.id.name;
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
        "Require component ownership filenames to match their exported PascalCase component name in either PascalCase or kebab-case form",
    },
    schema: [],
    messages: {
      invalidComponentFileName:
        'Rename this file to either "ComponentName.tsx" or "component-name.tsx" so its basename can map deterministically to the exported component name.',
      invalidComponentExportName:
        "Rename the exported component to PascalCase. Component ownership files must export a PascalCase component name.",
      mismatchedComponentFileName:
        'Rename this file or the exported component so they match exactly. "{{ exportedName }}" must live in either "{{ pascalFilename }}" or "{{ kebabFilename }}".',
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const exportedComponentName = readFirstRuntimeExportName(node);
        if (!exportedComponentName) {
          return;
        }

        const expectedComponentName = readExpectedComponentNameFromFilename(context.filename);
        if (!expectedComponentName) {
          context.report({
            node,
            messageId: "invalidComponentFileName",
          });
          return;
        }

        if (!isPascalCase(exportedComponentName)) {
          context.report({
            node,
            messageId: "invalidComponentExportName",
          });
        }

        if (exportedComponentName === expectedComponentName) {
          return;
        }

        const kebabFilename = `${exportedComponentName.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase()}.tsx`;

        context.report({
          node,
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
