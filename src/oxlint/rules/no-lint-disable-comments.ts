import type { RuleModule } from "./types.ts";

const noLintDisableCommentsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow inline lint-disable comments for eslint and oxlint",
      guidance:
        "Fix policy violations in code instead of silencing the linter. Do not commit eslint or oxlint disable comments.",
    },
    schema: [],
    messages: {
      unexpectedLintDisableComment:
        "Do not use inline lint-disable comments. Fix the code to satisfy the shared policy instead of bypassing it locally.",
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        const comments = sourceCode.getAllComments();

        comments.forEach((comment) => {
          const value = comment.value.trim();

          if (
            value.startsWith("eslint-disable") ||
            value.startsWith("eslint-enable") ||
            value.startsWith("oxlint-disable") ||
            value.startsWith("oxlint-enable")
          ) {
            context.report({
              loc: comment.loc,
              messageId: "unexpectedLintDisableComment",
            });
          }
        });
      },
    };
  },
};

export default noLintDisableCommentsRule;
