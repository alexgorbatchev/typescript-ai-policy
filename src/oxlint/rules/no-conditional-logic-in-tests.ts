import type { RuleModule } from "./types.ts";
import { isTestFile } from "./helpers.ts";

const noConditionalLogicInTestsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Ban conditional control flow inside committed test files",
    },
    schema: [],
    messages: {
      forbiddenConditionalLogic:
        "Remove this {{ conditionalKind }} from the test. Committed tests must execute assertions deterministically, so use assert(...) for narrowing or failure instead of branching test control flow.",
    },
  },
  create(context) {
    if (!isTestFile(context.filename)) {
      return {};
    }

    return {
      ConditionalExpression(node) {
        context.report({
          node,
          messageId: "forbiddenConditionalLogic",
          data: {
            conditionalKind: "ternary expression",
          },
        });
      },
      IfStatement(node) {
        context.report({
          node,
          messageId: "forbiddenConditionalLogic",
          data: {
            conditionalKind: '"if" statement',
          },
        });
      },
      SwitchStatement(node) {
        context.report({
          node,
          messageId: "forbiddenConditionalLogic",
          data: {
            conditionalKind: '"switch" statement',
          },
        });
      },
    };
  },
};

export default noConditionalLogicInTestsRule;
