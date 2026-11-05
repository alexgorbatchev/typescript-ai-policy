import type { RuleModule } from "./types.ts";
import {
  getBaseName,
  getPathSegments,
  isInStoriesDirectory,
  readPathFromStoriesDirectory,
  readProgramReportNode,
} from "./helpers.ts";

const ALLOWED_STORY_FILES_PATTERN = /^[^/]+\.stories\.tsx$/u;
const ALLOWED_SUPPORT_FILES = new Set(["fixtures.ts", "fixtures.tsx", "helpers.ts", "helpers.tsx"]);

function isAllowedStoriesDirectoryPath(relativePath: string): boolean {
  if (getPathSegments(relativePath).slice(0, -1).includes("fixtures")) {
    return true;
  }

  const basename = getBaseName(relativePath);
  if (ALLOWED_SUPPORT_FILES.has(basename)) {
    return true;
  }

  return ALLOWED_STORY_FILES_PATTERN.test(basename);
}

const storiesDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Restrict each stories catalog group to story files, helpers, and fixtures",
      guidance:
        'Organize "stories/" into catalog groups containing "*.stories.tsx", group-local "helpers.ts{,x}", and one "fixtures.ts{,x}" or "fixtures/" entrypoint. Fixture directories may contain nested support files; move runtime modules and other support roles out of the story tree.',
    },
    schema: [],
    messages: {
      invalidStoriesDirectoryFile:
        'Keep only "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" in each "stories/" catalog group. Move runtime modules outside the story tree.',
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
