import type { RuleModule } from "./types.ts";
import { isInStoriesDirectory, readPathFromStoriesDirectory, readProgramReportNode } from "./helpers.ts";

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
      guidance:
        'Keep "stories/" limited to "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move runtime files and other support roles out of the story tree.',
    },
    schema: [],
    messages: {
      invalidStoriesDirectoryFile:
        'Only "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" are allowed in "stories/".',
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
          node: readProgramReportNode(node),
          messageId: "invalidStoriesDirectoryFile",
        });
      },
    };
  },
};

export default storiesDirectoryFileConventionRule;
