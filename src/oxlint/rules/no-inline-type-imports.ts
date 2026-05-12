import type { RuleModule } from "./types.ts";
import { readLiteralStringValue } from "./helpers.ts";

const noInlineTypeImportsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow inline type imports, preferring explicit top-level type imports.",
      guidance:
        "Hoist type imports to explicit top-level `import type` declarations. Do not hide imported types inside inline `import()` expressions.",
    },
    schema: [],
    messages: {
      noInlineTypeImport:
        "Do not use inline type imports (`import('{{ importPath }}')`). Use an explicit top-level type import instead.",
    },
  },
  create(context) {
    return {
      TSImportType(node) {
        if (node.parent?.type === "TSTypeQuery") {
          return;
        }

        const importPath = readLiteralStringValue(node.source) || "...";

        context.report({
          node,
          messageId: "noInlineTypeImport",
          data: {
            importPath,
          },
        });
      },
    };
  },
};

export default noInlineTypeImportsRule;
