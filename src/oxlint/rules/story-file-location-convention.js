import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBaseName, getStorySourceBaseName, readPathFromStoriesDirectory } from "./helpers.js";

function readRequiredSiblingComponentFilePath(filename) {
  const storySourceBaseName = getStorySourceBaseName(filename);
  if (!storySourceBaseName) {
    return null;
  }

  return join(dirname(dirname(filename)), `${storySourceBaseName}.tsx`);
}

const storyFileLocationConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        'Require Storybook files to live as direct children of a sibling "stories/" directory and match a sibling component ownership file basename',
    },
    schema: [],
    messages: {
      invalidStoryFileLocation:
        'Move this story file into a direct-child sibling "stories/" directory as "stories/{{ expectedStoryFileName }}". Storybook files must not live outside that colocated directory or inside nested subdirectories.',
      missingSiblingComponent:
        'Rename or move this story so it matches an existing sibling component ownership file. Expected "{{ requiredComponentFilePath }}" to exist for this story file.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const relativeStoryPath = readPathFromStoriesDirectory(context.filename);
        if (relativeStoryPath === null || relativeStoryPath.includes("/")) {
          context.report({
            node,
            messageId: "invalidStoryFileLocation",
            data: {
              expectedStoryFileName: getBaseName(context.filename),
            },
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
