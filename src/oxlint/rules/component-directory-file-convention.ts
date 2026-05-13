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
        "Keep component directories limited to files that belong to the component surface. Move unrelated file roles out of component directories.",
    },
    schema: [],
    messages: {
      invalidComponentDirectoryFile:
        'Move or rename "{{ relativePath }}". A "{{ directoryName }}/" directory may contain only component ".tsx" files, nested component-area subdirectories, "constants.ts", "index.ts", or "types.ts" support files, or a sibling "stories/" tree.',
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
          data: {
            directoryName: componentDirectoryMatch.directoryName,
            relativePath: componentDirectoryMatch.relativePath || ".",
          },
        });
      },
    };
  },
};

export default componentDirectoryFileConventionRule;
