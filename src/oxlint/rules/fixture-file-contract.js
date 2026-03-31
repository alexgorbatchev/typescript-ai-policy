import { isFixturesFile } from "./helpers.js";

const fixtureFileContractRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        "Only allow direct const fixture exports and function factory exports in the __tests__/fixtures entrypoint",
    },
    schema: [],
    messages: {
      unexpectedDefaultExport:
        "The __tests__/fixtures entrypoint (fixtures.ts or fixtures.tsx) must not use a default export.",
      unexpectedExportDeclaration:
        "The __tests__/fixtures entrypoint may only export const declarations and function declarations.",
      unexpectedExportList:
        "The __tests__/fixtures entrypoint must declare fixture exports directly instead of using export lists or re-exports.",
      unexpectedExportPattern:
        "The __tests__/fixtures entrypoint exported const declarations must bind identifiers directly.",
      unexpectedVariableKind:
        'The __tests__/fixtures entrypoint may only export const declarations. Received "{{ kind }}".',
    },
  },
  create(context) {
    if (!isFixturesFile(context.filename)) {
      return {};
    }

    return {
      ExportAllDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedExportList",
        });
      },
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedDefaultExport",
        });
      },
      ExportNamedDeclaration(node) {
        if (node.source || !node.declaration) {
          context.report({
            node,
            messageId: "unexpectedExportList",
          });
          return;
        }

        const declaration = node.declaration;
        if (declaration.type === "VariableDeclaration") {
          if (declaration.kind !== "const") {
            context.report({
              node: declaration,
              messageId: "unexpectedVariableKind",
              data: {
                kind: declaration.kind,
              },
            });
            return;
          }

          declaration.declarations.forEach((declarator) => {
            if (declarator.id.type === "Identifier") {
              return;
            }

            context.report({
              node: declarator.id,
              messageId: "unexpectedExportPattern",
            });
          });
          return;
        }

        if (declaration.type === "FunctionDeclaration" && declaration.id && declaration.declare !== true) {
          return;
        }

        context.report({
          node: declaration,
          messageId: "unexpectedExportDeclaration",
        });
      },
    };
  },
};

export default fixtureFileContractRule;
