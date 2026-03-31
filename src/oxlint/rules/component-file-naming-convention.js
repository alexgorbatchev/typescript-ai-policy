import {
  getFilenameWithoutExtension,
  isExemptSupportBasename,
  isPascalCase,
  readDeclarationIdentifierNames,
} from "./helpers.js";

function isTypeOnlyExportSpecifier(specifier, exportDeclaration) {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

function readExportedSpecifierName(specifier) {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function readFirstRuntimeExportName(program) {
  for (const statement of program.body) {
    const exportName = readStatementRuntimeExportName(statement);
    if (exportName) {
      return exportName;
    }
  }

  return null;
}

function readStatementRuntimeExportName(statement) {
  if (statement.type === "ExportDefaultDeclaration") {
    return readDeclarationIdentifierNames(statement.declaration)[0] ?? null;
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

function readDeclarationRuntimeExportName(declaration) {
  if (
    declaration.type === "TSTypeAliasDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "ExportNamedDeclaration"
  ) {
    return null;
  }

  if (declaration.type === "VariableDeclaration") {
    const firstDeclarator = declaration.declarations[0];
    if (!firstDeclarator || firstDeclarator.id.type !== "Identifier") {
      return null;
    }

    return firstDeclarator.id.name;
  }

  return readDeclarationIdentifierNames(declaration)[0] ?? null;
}

function readExpectedComponentNameFromFilename(filename) {
  const fileStem = getFilenameWithoutExtension(filename);
  if (isPascalCase(fileStem)) {
    return fileStem;
  }

  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(fileStem)) {
    return null;
  }

  return fileStem
    .split("-")
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join("");
}

const componentFileNamingConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
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
