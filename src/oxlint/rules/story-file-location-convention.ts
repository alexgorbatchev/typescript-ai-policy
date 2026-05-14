import type { AstProgram, RuleModule } from "./types.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getStorySourceBaseName,
  readPathFromStoriesDirectory,
  readProgramReportNode,
  readRootPathBeforeDirectory,
} from "./helpers.ts";

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
        'Require Storybook files to live under a sibling "stories/" directory and match a sibling component ownership file basename',
      guidance:
        "Keep `*.stories.tsx` files under `stories/`. Move misplaced story files into the canonical story directory.",
    },
    schema: [],
    messages: {
      invalidStoryFileLocation: 'Place story files in a sibling "stories/" directory.',
      missingSiblingComponent: "Rename or move this story to match a sibling component ownership file.",
    },
  },
  create(context) {
    return {
      Program(node: AstProgram) {
        const reportNode = readProgramReportNode(node);
        const relativeStoryPath = readPathFromStoriesDirectory(context.filename);
        if (relativeStoryPath === null) {
          context.report({
            node: reportNode,
            messageId: "invalidStoryFileLocation",
          });
          return;
        }

        const requiredComponentFilePath = readRequiredSiblingComponentFilePath(context.filename);
        if (requiredComponentFilePath === null || existsSync(requiredComponentFilePath)) {
          return;
        }

        context.report({
          node: reportNode,
          messageId: "missingSiblingComponent",
        });
      },
    };
  },
};

export default storyFileLocationConventionRule;
