import type { RuleModule } from "./types.ts";
import { isTestFile } from "./helpers.ts";

const noThrowInTestsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: 'Ban "throw new Error(...)" inside committed test files',
    },
    schema: [],
    messages: {
      forbiddenThrowNewError:
        'Remove this "throw new Error(...)" from the test. Use assert(...) or assert.fail(...) from "node:assert" so failures stay explicit and deterministic.',
    },
  },
  create(context) {
    if (!isTestFile(context.filename)) {
      return {};
    }

    return {
      ThrowStatement(node) {
        if (node.argument?.type !== "NewExpression") {
          return;
        }

        if (node.argument.callee.type !== "Identifier" || node.argument.callee.name !== "Error") {
          return;
        }

        context.report({
          node,
          messageId: "forbiddenThrowNewError",
        });
      },
    };
  },
};

export default noThrowInTestsRule;
