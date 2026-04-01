import type { RuleModule } from "./types.ts";
import { isInStoriesDirectory, readPathFromStoriesDirectory } from "./helpers.ts";

const ALLOWED_ROOT_STORY_FILES_PATTERN = /^[^/]+\.stories\.tsx$/u;
const ALLOWED_SUPPORT_FILES = new Set(["fixtures.ts", "fixtures.tsx", "helpers.ts", "helpers.tsx"]);

function isAllowedStoriesDirectoryPath(relativePath: string): boolean {
  if (relativePath.startsWith("fixtures/")) {
    return true;
  }

  if (ALLOWED_SUPPORT_FILES.has(relativePath)) {
    return true;
  }

  return ALLOWED_ROOT_STORY_FILES_PATTERN.test(relativePath);
}

const storiesDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Restrict stories directory contents to story files, helpers, and fixtures",
    },
    schema: [],
    messages: {
      invalidStoriesDirectoryFile:
        'Move or rename "{{ relativePath }}". A "stories" directory may contain only "*.stories.tsx", "helpers.ts", "helpers.tsx", "fixtures.ts", "fixtures.tsx", or files under "fixtures/".',
    },
  },
  create(context) {
    return {
      Program(node) {
        if (!isInStoriesDirectory(context.filename)) {
          return;
        }

        const relativePath = readPathFromStoriesDirectory(context.filename);
        if (!relativePath || isAllowedStoriesDirectoryPath(relativePath)) {
          return;
        }

        context.report({
          node,
          messageId: "invalidStoriesDirectoryFile",
          data: {
            relativePath,
          },
        });
      },
    };
  },
};

export default storiesDirectoryFileConventionRule;
