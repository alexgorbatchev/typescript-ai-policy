import type { RuleModule } from "./types.ts";
import { isFixturesFile } from "./helpers.ts";

const fixtureFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Only allow direct const fixture exports and function factory exports in nested "fixtures.ts" or "fixtures.tsx" entrypoints under "__tests__/" or "stories/"',
      guidance:
        "Use `fixtures.ts`, `fixtures.tsx`, or fixture support files only for shared fixture data and factories. Keep test execution logic and unrelated exports out of fixture entrypoints.",
    },
    schema: [],
    messages: {
      unexpectedDefaultExport: 'Use named exports only in nested "fixtures.ts" or "fixtures.tsx" entrypoints.',
      unexpectedExportDeclaration:
        'Export only "const fixture_*" bindings or "function factory_*()" declarations from nested "fixtures.ts" or "fixtures.tsx" entrypoints.',
      unexpectedExportList:
        "Inline the exported declaration in this nested fixture entrypoint. Do not use export lists or re-exports here.",
      unexpectedExportPattern: "Export fixture consts from direct identifiers only.",
      unexpectedVariableKind: 'Export fixture bindings as "const".',
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
