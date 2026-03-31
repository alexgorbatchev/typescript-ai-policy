import { isInTestsDirectory, readPathFromTestsDirectory } from "./helpers.js";

const ALLOWED_ROOT_TEST_FILES_PATTERN = /^[^/]+\.test\.tsx?$/u;
const ALLOWED_SUPPORT_FILES = new Set(["fixtures.ts", "fixtures.tsx", "helpers.ts", "helpers.tsx"]);

function isAllowedTestsDirectoryPath(relativePath) {
  if (relativePath.startsWith("fixtures/")) {
    return true;
  }

  if (ALLOWED_SUPPORT_FILES.has(relativePath)) {
    return true;
  }

  return ALLOWED_ROOT_TEST_FILES_PATTERN.test(relativePath);
}

const testsDirectoryFileConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Restrict __tests__ directory contents to tests, helpers, and fixtures",
    },
    schema: [],
    messages: {
      invalidTestsDirectoryFile:
        "Only *.test.ts, *.test.tsx, fixtures.{ts,tsx}, fixtures/*, and helpers.{ts,tsx} are allowed in __tests__ (found {{ relativePath }}).",
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
