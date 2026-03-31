import {
  getExtension,
  isExemptSupportBasename,
  isStrictAreaAllowedSupportFile,
  readPathFromFirstMatchingDirectory,
} from "./helpers.js";

const COMPONENT_DIRECTORY_NAMES = new Set(["components", "templates", "layouts"]);

function isAllowedComponentDirectoryRelativePath(relativePath, filename) {
  if (!relativePath) {
    return false;
  }

  if (relativePath.startsWith("__tests__/")) {
    return true;
  }

  if (relativePath.includes("/")) {
    return false;
  }

  if (isStrictAreaAllowedSupportFile(filename)) {
    return true;
  }

  return getExtension(filename) === ".tsx" && !isExemptSupportBasename(filename);
}

const componentDirectoryFileConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        'Restrict "components", "templates", and "layouts" directories to direct-child component files, exempt support basenames, and sibling "__tests__" trees',
    },
    schema: [],
    messages: {
      invalidComponentDirectoryFile:
        'Move or rename "{{ relativePath }}". A "{{ directoryName }}/" directory may contain only direct-child component ".tsx" files, direct-child "index.ts" or "types.ts" files, or a direct-child "__tests__/" tree.',
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
