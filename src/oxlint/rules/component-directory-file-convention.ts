import type { RuleModule } from "./types.ts";
import {
  COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
  COMPONENT_OWNERSHIP_SUPPORT_FILES,
  getBaseName,
  getExtension,
  isExemptSupportBasename,
  isInStoriesSubtree,
  isTestsDirectoryPath,
  readPathFromDirectory,
  readPathFromFirstMatchingDirectory,
  readProgramReportNode,
} from "./helpers.ts";

function isAllowedComponentDirectoryRelativePath(relativePath: string, filename: string): boolean {
  if (!relativePath) {
    return false;
  }

  if (isInStoriesSubtree(relativePath)) {
    return true;
  }

  if (isTestsDirectoryPath(relativePath) || readPathFromDirectory(relativePath, "hooks") !== null) {
    return true;
  }

  if (COMPONENT_OWNERSHIP_SUPPORT_FILES.has(getBaseName(filename))) {
    return true;
  }

  return getExtension(filename) === ".tsx" && !isExemptSupportBasename(filename);
}

const componentDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Restrict "components", "templates", and "layouts" to component ownership files, canonical support files, and nested story, test, or hook roles',
      guidance:
        'Keep "components/", "templates/", and "layouts/" limited to component ".tsx" ownership files, "constants.ts", "index.ts", "types.ts", and nested component subdirectories. Place local stories, tests, and hooks in "stories/", "__tests__/", and "hooks/" subtrees, where their stricter role rules validate the contents.',
    },
    schema: [],
    messages: {
      invalidComponentDirectoryFile:
        'Keep component ".tsx" files and "constants.ts", "index.ts", or "types.ts" in component areas. Place stories, tests, and hooks in their canonical "stories/", "__tests__/", or "hooks/" subtrees.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const componentDirectoryMatch = readPathFromFirstMatchingDirectory(
          context.filename,
          COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
        );
        if (!componentDirectoryMatch) {
          return;
        }

        if (isAllowedComponentDirectoryRelativePath(componentDirectoryMatch.relativePath, context.filename)) {
          return;
        }

        context.report({
          node: readProgramReportNode(node),
          messageId: "invalidComponentDirectoryFile",
        });
      },
    };
  },
};

export default componentDirectoryFileConventionRule;
