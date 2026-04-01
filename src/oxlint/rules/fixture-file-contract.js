import { isFixturesFile } from "./helpers.js";

const fixtureFileContractRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        "Only allow direct const fixture exports and function factory exports in the __tests__/fixtures or stories/fixtures entrypoint",
    },
    schema: [],
    messages: {
      unexpectedDefaultExport:
        'Remove the default export. The fixture entrypoint ("__tests__/fixtures" or "stories/fixtures") must use only named exports.',
      unexpectedExportDeclaration:
        'Replace this export with either "export const fixture_* = ..." or "export function factory_*() { ... }" in the fixture entrypoint ("__tests__/fixtures" or "stories/fixtures").',
      unexpectedExportList:
        'Inline the exported declaration in the fixture entrypoint ("__tests__/fixtures" or "stories/fixtures"). Do not use export lists or re-exports there.',
      unexpectedExportPattern:
        'Bind the exported const to a direct identifier, for example "export const fixture_user = ...". Do not export destructuring patterns from the fixture entrypoint ("__tests__/fixtures" or "stories/fixtures").',
      unexpectedVariableKind:
        'Change this exported "{{ kind }}" declaration to "const". The fixture entrypoint ("__tests__/fixtures" or "stories/fixtures") allows only exported const declarations.',
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
