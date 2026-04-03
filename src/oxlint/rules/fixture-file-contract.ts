import type { RuleModule } from "./types.ts";
import { isFixturesFile } from "./helpers.ts";

const fixtureFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Only allow direct const fixture exports and function factory exports in nested "fixtures.ts" or "fixtures.tsx" entrypoints under "__tests__/" or "stories/"',
    },
    schema: [],
    messages: {
      unexpectedDefaultExport:
        'Remove the default export. A nested "fixtures.ts" or "fixtures.tsx" entrypoint under "__tests__/" or "stories/" must use only named exports.',
      unexpectedExportDeclaration:
        'Replace this export with either "export const fixture_* = ..." or "export function factory_*() { ... }" in a nested "fixtures.ts" or "fixtures.tsx" entrypoint under "__tests__/" or "stories/".',
      unexpectedExportList:
        "Inline the exported declaration in this nested fixture entrypoint. Do not use export lists or re-exports here.",
      unexpectedExportPattern:
        'Bind the exported const to a direct identifier, for example "export const fixture_user = ...". Do not export destructuring patterns from a nested fixture entrypoint.',
      unexpectedVariableKind:
        'Change this exported "{{ kind }}" declaration to "const". Nested fixture entrypoints allow only exported const declarations.',
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

        if (declaration.type === "FunctionDeclaration" && declaration.id) {
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
