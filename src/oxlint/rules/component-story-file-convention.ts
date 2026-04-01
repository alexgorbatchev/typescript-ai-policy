import type { AstProgram, RuleModule } from "./types.ts";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getFilenameWithoutExtension, isExemptSupportBasename } from "./helpers.ts";

function readRequiredComponentStoryFilePath(filename: string): string {
  const sourceBaseName = getFilenameWithoutExtension(filename);

  return join(dirname(filename), "stories", `${sourceBaseName}.stories.tsx`);
}

function readForbiddenComponentTestFilePaths(filename: string): string[] {
  const sourceBaseName = getFilenameWithoutExtension(filename);
  const testsDirectoryPath = join(dirname(filename), "__tests__");

  return [
    join(testsDirectoryPath, `${sourceBaseName}.test.ts`),
    join(testsDirectoryPath, `${sourceBaseName}.test.tsx`),
  ];
}

const componentStoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require every component ownership file to have a sibling "stories/basename.stories.tsx" file and ban sibling basename-matched component test files',
    },
    schema: [],
    messages: {
      missingComponentStoryFile:
        'Add the colocated component story file at "{{ requiredStoryFilePath }}". Component ownership files must be tested through a sibling "stories/basename.stories.tsx" file.',
      unexpectedComponentTestFile:
        'Remove the sibling component test file at "{{ forbiddenTestFilePath }}". Component ownership files must use the colocated Storybook story file and its play functions instead of basename-matched files under "__tests__/".',
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node: AstProgram) {
        const requiredStoryFilePath = readRequiredComponentStoryFilePath(context.filename);
        if (!existsSync(requiredStoryFilePath)) {
          context.report({
            node,
            messageId: "missingComponentStoryFile",
            data: {
              requiredStoryFilePath,
            },
          });
        }

        readForbiddenComponentTestFilePaths(context.filename).forEach((forbiddenTestFilePath) => {
          if (!existsSync(forbiddenTestFilePath)) {
            return;
          }

          context.report({
            node,
            messageId: "unexpectedComponentTestFile",
            data: {
              forbiddenTestFilePath,
            },
          });
        });
      },
    };
  },
};

export default componentStoryFileConventionRule;
