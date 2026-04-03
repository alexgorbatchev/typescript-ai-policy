import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, RuleModule } from "./types.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getStorySourceBaseName,
  readAbbreviatedPath,
  readPathFromStoriesDirectory,
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

function readReportNode(program: AstProgram): TSESTree.Node {
  return program.body[0] ?? program;
}

const storyFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require Storybook files to live under a sibling "stories/" directory and match a sibling component ownership file basename',
    },
    schema: [],
    messages: {
      invalidStoryFileLocation:
        'Move this story file under a "stories/" directory. Storybook files must not live outside a sibling "stories/" tree.',
      missingSiblingComponent:
        'Rename or move this story so it matches an existing sibling component ownership file. "{{ requiredComponentFilePath }}" must exist for this story file.',
    },
  },
  create(context) {
    return {
      Program(node: AstProgram) {
        const reportNode = readReportNode(node);
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
          data: {
            requiredComponentFilePath: readAbbreviatedPath(requiredComponentFilePath),
          },
        });
      },
    };
  },
};

export default storyFileLocationConventionRule;
