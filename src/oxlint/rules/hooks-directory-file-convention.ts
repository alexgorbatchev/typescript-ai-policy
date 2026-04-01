import type { RuleModule } from "./types.ts";
import {
  getExtension,
  getFilenameWithoutExtension,
  isStrictAreaAllowedSupportFile,
  readPathFromDirectory,
} from "./helpers.ts";

function isAllowedHookOwnershipBasename(filename: string): boolean {
  const extension = getExtension(filename);
  if (extension !== ".ts" && extension !== ".tsx") {
    return false;
  }

  return getFilenameWithoutExtension(filename).startsWith("use");
}

function isAllowedHooksDirectoryRelativePath(relativePath: string, filename: string): boolean {
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

  return isAllowedHookOwnershipBasename(filename);
}

const hooksDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Restrict "hooks" directories to direct-child hook ownership files, exempt support basenames, and sibling "__tests__" trees',
    },
    schema: [],
    messages: {
      invalidHooksDirectoryFile:
        'Move or rename "{{ relativePath }}". A "hooks/" directory may contain only direct-child "use*.ts" or "use*.tsx" ownership files, direct-child "index.ts" or "types.ts" files, or a direct-child "__tests__/" tree.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const relativePath = readPathFromDirectory(context.filename, "hooks");
        if (relativePath === null) {
          return;
        }

        if (isAllowedHooksDirectoryRelativePath(relativePath, context.filename)) {
          return;
        }

        context.report({
          node,
          messageId: "invalidHooksDirectoryFile",
          data: {
            relativePath: relativePath || ".",
          },
        });
      },
    };
  },
};

export default hooksDirectoryFileConventionRule;
