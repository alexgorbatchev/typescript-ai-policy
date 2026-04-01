import { getBaseName, getExtension, isExemptSupportBasename, readPathFromFirstMatchingDirectory } from "./helpers.js";

const COMPONENT_DIRECTORY_NAMES = new Set(["components", "templates", "layouts"]);
const COMPONENT_ALLOWED_SUPPORT_FILES = new Set(["constants.ts", "index.ts", "types.ts"]);

function isAllowedComponentDirectoryRelativePath(relativePath, filename) {
  if (!relativePath) {
    return false;
  }

  if (relativePath.startsWith("stories/")) {
    return true;
  }

  if (relativePath.includes("/")) {
    return false;
  }

  if (COMPONENT_ALLOWED_SUPPORT_FILES.has(getBaseName(filename))) {
    return true;
  }

  return getExtension(filename) === ".tsx" && !isExemptSupportBasename(filename);
}

const componentDirectoryFileConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        'Restrict "components", "templates", and "layouts" directories to direct-child component files, direct-child support files (`constants.ts`, `index.ts`, `types.ts`), and sibling "stories/" trees',
    },
    schema: [],
    messages: {
      invalidComponentDirectoryFile:
        'Move or rename "{{ relativePath }}". A "{{ directoryName }}/" directory may contain only direct-child component ".tsx" files, direct-child "constants.ts", "index.ts", or "types.ts" files, or a direct-child "stories/" tree.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const componentDirectoryMatch = readPathFromFirstMatchingDirectory(context.filename, COMPONENT_DIRECTORY_NAMES);
        if (!componentDirectoryMatch) {
          return;
        }

        if (isAllowedComponentDirectoryRelativePath(componentDirectoryMatch.relativePath, context.filename)) {
          return;
        }

        context.report({
          node,
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
