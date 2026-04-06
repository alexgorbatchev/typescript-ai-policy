import type { AstExpression, RuleModule } from "./types.ts";
import { getBaseName, isInTestsDirectory, readProgramReportNode } from "./helpers.ts";

const TEST_FRAMEWORK_MODULES = new Set(["@jest/globals", "bun:test", "node:test", "vitest"]);
const TEST_IMPORT_NAMES = new Set(["describe", "it", "test"]);
const REQUIRED_TEST_FILE_NAME_PATTERN = /\.test\.tsx?$/u;
const SPEC_TEST_FILE_NAME_PATTERN = /\.spec\.tsx?$/u;

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
      description:
        'Require non-.spec test files to live under a sibling "__tests__/" directory and use the .test.ts/.test.tsx suffix',
    },
    schema: [],
    messages: {
      invalidTestFileName: 'Rename this file to match the "*.test.ts" or "*.test.tsx" pattern.',
      missingTestsDirectory:
        'Move this test file into a sibling "__tests__/" directory. Misplaced tests belong at "__tests__/basename.test.ts[x]" next to the source they cover.',
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
        if (SPEC_TEST_FILE_NAME_PATTERN.test(baseName)) {
          return;
        }

        const looksLikeTestFile = hasTestDefinitionCall || REQUIRED_TEST_FILE_NAME_PATTERN.test(baseName);
        if (!looksLikeTestFile) {
          return;
        }

        const reportNode = readProgramReportNode(node);

        if (!isInTestsDirectory(context.filename)) {
          context.report({
            node: reportNode,
            messageId: "missingTestsDirectory",
          });
        }

        if (!REQUIRED_TEST_FILE_NAME_PATTERN.test(baseName)) {
          context.report({
            node: reportNode,
            messageId: "invalidTestFileName",
          });
        }
      },
    };
  },
};

export default testFileLocationConventionRule;
