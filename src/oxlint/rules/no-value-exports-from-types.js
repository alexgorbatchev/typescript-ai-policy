import { hasBaseName, isTypeDeclaration, readDeclarationIdentifierNames, readLiteralStringValue } from "./helpers.js";

function readExportedSpecifierName(specifier) {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function isTypeOnlyExportSpecifier(specifier, exportDeclaration) {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

const noValueExportsFromTypesRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: 'Disallow value exports from files whose filename is "types"',
    },
    schema: [],
    messages: {
      unexpectedDefaultExport: 'Remove this default export from the "types" file. "types.ts" may export types only.',
      unexpectedExportAssignment:
        'Remove this runtime export assignment from the "types" file. "types.ts" may export types only.',
      unexpectedValueExport:
        'Move exported value "{{ name }}" out of this "types" file. "types.ts" may export types only; put runtime values in "constants.ts" or another implementation module instead.',
      unexpectedValueExportAll:
        'Do not re-export runtime values from "{{ exportPath }}" through a "types" file. Re-export them from "constants.ts" or another implementation module instead.',
    },
  },
  create(context) {
    if (!hasBaseName(context.filename, "types")) {
      return {};
    }

    return {
      ExportAllDeclaration(node) {
        if (node.exportKind === "type") {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedValueExportAll",
          data: {
            exportPath: readLiteralStringValue(node.source) ?? "this module",
          },
        });
      },
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedDefaultExport",
        });
      },
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          if (isTypeDeclaration(node.declaration)) {
            return;
          }

          const exportNames = readDeclarationIdentifierNames(node.declaration);
          if (exportNames.length === 0) {
            context.report({
              node: node.declaration,
              messageId: "unexpectedValueExport",
              data: {
                name: "this binding",
              },
            });
            return;
          }

          exportNames.forEach((name) => {
            context.report({
              node: node.declaration,
              messageId: "unexpectedValueExport",
              data: {
                name,
              },
            });
          });
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (isTypeOnlyExportSpecifier(specifier, node)) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedValueExport",
            data: {
              name: readExportedSpecifierName(specifier),
            },
          });
        });
      },
      TSExportAssignment(node) {
        context.report({
          node,
          messageId: "unexpectedExportAssignment",
        });
      },
    };
  },
};

export default noValueExportsFromTypesRule;
