import type { AstExpression, RuleModule } from "./types.ts";
import { getBaseName, isInTestsDirectory } from "./helpers.ts";

const TEST_FRAMEWORK_MODULES = new Set(["@jest/globals", "bun:test", "node:test", "vitest"]);
const TEST_IMPORT_NAMES = new Set(["describe", "it", "test"]);
const REQUIRED_TEST_FILE_NAME_PATTERN = /\.test\.tsx?$/u;
const TEST_LIKE_FILE_NAME_PATTERN = /\.(spec|test)\.tsx?$/u;

function readCallTargetName(node: AstExpression): string | null {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.property.type === "Identifier"
  ) {
    return node.object.name;
  }

  return null;
}

const testFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Require test files to live in __tests__ and use the .test.ts/.test.tsx suffix",
    },
    schema: [],
    messages: {
      invalidTestFileName: 'Rename this file to match the "*.test.ts" or "*.test.tsx" pattern.',
      missingTestsDirectory: 'Move this test file into a sibling "__tests__" directory.',
    },
  },
  create(context) {
    const testFunctionNames = new Set();
    let hasTestDefinitionCall = false;

    return {
      ImportDeclaration(node) {
        if (!TEST_FRAMEWORK_MODULES.has(String(node.source?.value ?? ""))) {
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type !== "ImportSpecifier") {
            return;
          }

          if (specifier.imported.type !== "Identifier" || specifier.local.type !== "Identifier") {
            return;
          }

          if (!TEST_IMPORT_NAMES.has(specifier.imported.name)) {
            return;
          }

          testFunctionNames.add(specifier.local.name);
        });
      },
      CallExpression(node) {
        const callTargetName = readCallTargetName(node.callee);
        if (!callTargetName) {
          return;
        }

        if (!testFunctionNames.has(callTargetName)) {
          return;
        }

        hasTestDefinitionCall = true;
      },
      "Program:exit"(node) {
        const baseName = getBaseName(context.filename);
        const looksLikeTestFile = hasTestDefinitionCall || TEST_LIKE_FILE_NAME_PATTERN.test(baseName);
        if (!looksLikeTestFile) {
          return;
        }

        if (!isInTestsDirectory(context.filename)) {
          context.report({
            node,
            messageId: "missingTestsDirectory",
          });
        }

        if (!REQUIRED_TEST_FILE_NAME_PATTERN.test(baseName)) {
          context.report({
            node,
            messageId: "invalidTestFileName",
          });
        }
      },
    };
  },
};

export default testFileLocationConventionRule;
