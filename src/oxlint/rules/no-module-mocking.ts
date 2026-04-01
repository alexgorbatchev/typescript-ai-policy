import type { AstExpression, RuleModule } from "./types.ts";

type CalleePath = string[];

function readCalleePath(node: AstExpression): CalleePath | null {
  if (node.type === "Identifier") {
    return [node.name];
  }

  if (node.type !== "MemberExpression" || node.computed || node.property.type !== "Identifier") {
    return null;
  }

  if (node.object.type !== "Identifier" && node.object.type !== "MemberExpression") {
    return null;
  }

  const objectPath = readCalleePath(node.object);
  if (!objectPath) {
    return null;
  }

  return [...objectPath, node.property.name];
}

function hasPathSuffix(path: readonly string[], suffix: readonly string[]): boolean {
  if (path.length < suffix.length) {
    return false;
  }

  return suffix.every((segment, index) => path[path.length - suffix.length + index] === segment);
}

const MODULE_MOCKING_SUFFIXES = [
  ["jest", "mock"],
  ["jest", "doMock"],
  ["jest", "setMock"],
  ["jest", "createMockFromModule"],
  ["jest", "enableAutomock"],
  ["jest", "unstable_mockModule"],
  ["vi", "mock"],
  ["vi", "doMock"],
  ["vi", "importMock"],
  ["mock", "module"],
] as const;

const noModuleMockingRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow module-mocking APIs across common test interfaces; use dependency injection instead",
    },
    schema: [],
    messages: {
      noModuleMocking:
        'Remove "{{ fullName }}". Pass collaborators into the unit under test and stub those injected dependencies in the test instead of mocking the whole module.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const calleePath = readCalleePath(node.callee);

        if (!calleePath) {
          return;
        }

        const isModuleMockingCall = MODULE_MOCKING_SUFFIXES.some((suffix) => hasPathSuffix(calleePath, suffix));
        if (!isModuleMockingCall) {
          return;
        }

        context.report({
          node,
          messageId: "noModuleMocking",
          data: {
            fullName: calleePath.join("."),
          },
        });
      },
    };
  },
};

export default noModuleMockingRule;
