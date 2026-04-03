import type { RuleModule } from "./types.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getStorySourceBaseName, readPathFromStoriesDirectory, readRootPathBeforeDirectory } from "./helpers.ts";

function readRequiredSiblingComponentFilePath(filename: string): string | null {
  const storySourceBaseName = getStorySourceBaseName(filename);
  if (!storySourceBaseName) {
    return null;
  }

  const siblingDirectoryPath = readRootPathBeforeDirectory(filename, "stories");
  if (siblingDirectoryPath === null) {
    return null;
  }

  return join(siblingDirectoryPath, `${storySourceBaseName}.tsx`);
}

const storyFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require Storybook files to live somewhere under a sibling "stories/" directory and match a sibling component ownership file basename',
    },
    schema: [],
    messages: {
      invalidStoryFileLocation:
        'Move this story file under a "stories/" directory. Storybook files must not live outside a sibling "stories/" tree.',
      missingSiblingComponent:
        'Rename or move this story so it matches an existing sibling component ownership file. Expected "{{ requiredComponentFilePath }}" to exist for this story file.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const relativeStoryPath = readPathFromStoriesDirectory(context.filename);
        if (relativeStoryPath === null) {
          context.report({
            node,
            messageId: "invalidStoryFileLocation",
          });
          return;
        }

        const requiredComponentFilePath = readRequiredSiblingComponentFilePath(context.filename);
        if (requiredComponentFilePath === null || existsSync(requiredComponentFilePath)) {
          return;
        }

        context.report({
          node,
          messageId: "missingSiblingComponent",
          data: {
            requiredComponentFilePath,
          },
        });
      },
    };
  },
};

export default storyFileLocationConventionRule;
