import type { RuleModule } from "./types.ts";
import {
  COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
  COMPONENT_OWNERSHIP_SUPPORT_FILES,
  getBaseName,
  getExtension,
  isExemptSupportBasename,
  isInStoriesSubtree,
  isTestsDirectoryPath,
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

  if (isTestsDirectoryPath(relativePath)) {
    return false;
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
        'Restrict "components", "templates", and "layouts" directories to component ownership files, nested component-area subdirectories, support files (`constants.ts`, `index.ts`, `types.ts`), and sibling "stories/" trees',
      guidance:
        'Keep "components/", "templates/", and "layouts/" limited to component ".tsx" ownership files, "constants.ts", "index.ts", "types.ts", nested component subdirectories, and sibling "stories/" trees. Move tests and other file roles to their canonical directories.',
    },
    schema: [],
    messages: {
      invalidComponentDirectoryFile:
        'Only component ".tsx" files, "constants.ts", "index.ts", "types.ts", nested component subdirectories, and "stories/**" are allowed in "components/", "templates/", and "layouts/".',
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
