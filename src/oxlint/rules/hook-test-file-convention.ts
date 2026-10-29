import type { AstProgram, RuleModule } from "./types.ts";
import { dirname, join } from "node:path";
import {
  findDescendantFilePath,
  getBaseName,
  getFilenameWithoutExtension,
  isExemptSupportBasename,
  isInStoriesDirectory,
  isInTestsDirectory,
  readProgramReportNode,
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
        'Require every hook ownership file to have a matching test with the same basename and source extension under a sibling "__tests__/" directory',
      guidance:
        "Place hook tests under the adjacent `__tests__/` directory with the same basename and source extension: `.ts` hooks require `.test.ts`, and `.tsx` hooks require `.test.tsx`. Do not leave hook tests beside runtime hook files or in unrelated folders.",
    },
    schema: [],
    messages: {
      missingHookTestFile:
        'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory, using the same extension as the hook source.',
    },
  },
  create(context) {
    if (
      isExemptSupportBasename(context.filename) ||
      isInStoriesDirectory(context.filename) ||
      isInTestsDirectory(context.filename)
    ) {
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
          node: readProgramReportNode(node),
          messageId: "missingHookTestFile",
        });
      },
    };
  },
};

export default hookTestFileConventionRule;
