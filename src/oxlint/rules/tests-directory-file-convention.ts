import type { RuleModule } from "./types.ts";
import { isInTestsDirectory, readPathFromTestsDirectory, readProgramReportNode } from "./helpers.ts";

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
      guidance:
        'Keep "__tests__/" limited to "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move runtime files and other support roles out of the test tree.',
    },
    schema: [],
    messages: {
      invalidTestsDirectoryFile:
        'Only "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" are allowed in "__tests__/".',
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
          node: readProgramReportNode(node),
          messageId: "invalidTestsDirectoryFile",
        });
      },
    };
  },
};

export default testsDirectoryFileConventionRule;
