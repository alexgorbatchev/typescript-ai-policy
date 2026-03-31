import { isTestFile } from "./helpers.js";

const TEST_FUNCTION_NAMES = new Set(["describe", "it", "test"]);
const BLOCKED_TEST_MODIFIERS = new Set(["if", "skipIf", "todo", "todoIf"]);

function readCalleeMember(node) {
  if (
    node.type !== "MemberExpression" ||
    node.computed ||
    node.object.type !== "Identifier" ||
    node.property.type !== "Identifier"
  ) {
    return null;
  }

  return {
    objectName: node.object.name,
    propertyName: node.property.name,
  };
}

const noNonRunningTestsRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Ban non-running test modifiers that suppress or gate test execution",
    },
    schema: [],
    messages: {
      forbiddenModifier:
        'Remove "{{ fullName }}". Committed tests must always run, so use plain describe(...), it(...), or test(...) instead of gated, skipped, or todo variants.',
    },
  },
  create(context) {
    if (!isTestFile(context.filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        const calleeMember = readCalleeMember(node.callee);
        if (!calleeMember) {
          return;
        }

        if (!TEST_FUNCTION_NAMES.has(calleeMember.objectName)) {
          return;
        }

        if (!BLOCKED_TEST_MODIFIERS.has(calleeMember.propertyName)) {
          return;
        }

        context.report({
          node,
          messageId: "forbiddenModifier",
          data: {
            fullName: `${calleeMember.objectName}.${calleeMember.propertyName}`,
          },
        });
      },
    };
  },
};

export default noNonRunningTestsRule;
