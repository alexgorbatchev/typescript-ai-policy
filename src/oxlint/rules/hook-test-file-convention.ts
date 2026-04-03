import type { AstProgram, RuleModule } from "./types.ts";
import { dirname, join } from "node:path";
import {
  findDescendantFilePath,
  getBaseName,
  getFilenameWithoutExtension,
  isExemptSupportBasename,
} from "./helpers.ts";

function readRequiredTestsDirectoryPath(filename: string): string {
  return join(dirname(filename), "__tests__");
}

function readRequiredHookTestFileName(filename: string): string {
  const sourceBaseName = getFilenameWithoutExtension(filename);
  const testExtension = getBaseName(filename).endsWith(".tsx") ? ".test.tsx" : ".test.ts";

  return `${sourceBaseName}${testExtension}`;
}

const hookTestFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require every hook ownership file to have a matching "basename.test.ts" or ".test.tsx" file somewhere under a sibling "__tests__/" directory',
    },
    schema: [],
    messages: {
      missingHookTestFile:
        'Add a test file named "{{ requiredTestFileName }}" somewhere under "{{ requiredTestsDirectoryPath }}". Hook ownership files must keep their tests under a sibling "__tests__/" directory.',
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node: AstProgram) {
        const requiredTestsDirectoryPath = readRequiredTestsDirectoryPath(context.filename);
        const requiredTestFileName = readRequiredHookTestFileName(context.filename);
        if (findDescendantFilePath(requiredTestsDirectoryPath, requiredTestFileName)) {
          return;
        }

        context.report({
          node,
          messageId: "missingHookTestFile",
          data: {
            requiredTestFileName,
            requiredTestsDirectoryPath,
          },
        });
      },
    };
  },
};

export default hookTestFileConventionRule;
