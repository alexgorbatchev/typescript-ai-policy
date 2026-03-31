import { hasBaseName, readLiteralStringValue } from "./helpers.js";

function readImportBindingName(specifier) {
  if (specifier.local?.type === "Identifier") {
    return specifier.local.name;
  }

  return "this binding";
}

function isTypeImportSpecifier(specifier, importDeclaration) {
  return importDeclaration.importKind === "type" || specifier.importKind === "type";
}

const noTypeImportsFromConstantsRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: 'Disallow type imports from modules whose filename is "constants"',
    },
    schema: [],
    messages: {
      unexpectedInlineTypeImport:
        'Do not reference "{{ importPath }}" through a type import. Move that exported type into a sibling "types.ts" module instead.',
      unexpectedTypeImport:
        'Do not import type "{{ name }}" from "{{ importPath }}". Move that exported type into a sibling "types.ts" module instead.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = readLiteralStringValue(node.source);
        if (!importPath || !hasBaseName(importPath, "constants")) {
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (!isTypeImportSpecifier(specifier, node)) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedTypeImport",
            data: {
              name: readImportBindingName(specifier),
              importPath,
            },
          });
        });
      },
      TSImportType(node) {
        const importPath = readLiteralStringValue(node.source);
        if (!importPath || !hasBaseName(importPath, "constants")) {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedInlineTypeImport",
          data: {
            importPath,
          },
        });
      },
    };
  },
};

export default noTypeImportsFromConstantsRule;
