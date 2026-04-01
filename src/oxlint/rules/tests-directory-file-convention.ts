import type { RuleModule } from "./types.ts";
import { isInTestsDirectory, readPathFromTestsDirectory } from "./helpers.ts";

const ALLOWED_ROOT_TEST_FILES_PATTERN = /^[^/]+\.test\.tsx?$/u;
const ALLOWED_SUPPORT_FILES = new Set(["fixtures.ts", "fixtures.tsx", "helpers.ts", "helpers.tsx"]);

function isAllowedTestsDirectoryPath(relativePath: string): boolean {
  if (relativePath.startsWith("fixtures/")) {
    return true;
  }

  if (ALLOWED_SUPPORT_FILES.has(relativePath)) {
    return true;
  }

  return ALLOWED_ROOT_TEST_FILES_PATTERN.test(relativePath);
}

const testsDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Restrict __tests__ directory contents to tests, helpers, and fixtures",
    },
    schema: [],
    messages: {
      invalidTestsDirectoryFile:
        'Move or rename "{{ relativePath }}". A "__tests__" directory may contain only "*.test.ts", "*.test.tsx", "helpers.ts", "helpers.tsx", "fixtures.ts", "fixtures.tsx", or files under "fixtures/".',
    },
  },
  create(context) {
    return {
      Program(node) {
        if (!isInTestsDirectory(context.filename)) {
          return;
        }

        const relativePath = readPathFromTestsDirectory(context.filename);
        if (!relativePath || isAllowedTestsDirectoryPath(relativePath)) {
          return;
        }

        context.report({
          node,
          messageId: "invalidTestsDirectoryFile",
          data: {
            relativePath,
          },
        });
      },
    };
  },
};

export default testsDirectoryFileConventionRule;
