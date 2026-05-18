import type { RuleModule } from "./types.ts";
import {
  getExtension,
  getFilenameWithoutExtension,
  isStrictAreaAllowedSupportFile,
  readPathFromDirectory,
  readProgramReportNode,
} from "./helpers.ts";
import {
  filenameStyleRuleSchema,
  isHookOwnershipFileStem,
  readFilenameStyle,
  readHookFilePattern,
} from "../filenameStyle.ts";

function isAllowedHookOwnershipBasename(
  filename: string,
  filenameStyle: ReturnType<typeof readFilenameStyle>,
): boolean {
  const extension = getExtension(filename);
  if (extension !== ".ts" && extension !== ".tsx") {
    return false;
  }

  return isHookOwnershipFileStem(getFilenameWithoutExtension(filename), filenameStyle);
}

function isAllowedHooksDirectoryRelativePath(
  relativePath: string,
  filename: string,
  filenameStyle: ReturnType<typeof readFilenameStyle>,
): boolean {
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

  return isAllowedHookOwnershipBasename(filename, filenameStyle);
}

const hooksDirectoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Restrict "hooks" directories to direct-child configured hook ownership files, exempt support basenames, and sibling "__tests__" trees',
      guidance:
        'Keep hook directories limited to direct-child ownership files named "useThing.ts{,x}" by default, or "use-thing.ts{,x}" when the shared config uses `FilenameStyle.DashCase`, plus approved support files.',
    },
    schema: filenameStyleRuleSchema,
    messages: {
      invalidHooksDirectoryFile:
        'Only "{{expectedHookFilePattern}}", "index.ts", "types.ts", and "__tests__/**" are allowed in "hooks/".',
    },
  },
  create(context) {
    const filenameStyle = readFilenameStyle(context.options);
    const expectedHookFilePattern = readHookFilePattern(filenameStyle);

    return {
      Program(node) {
        const relativePath = readPathFromDirectory(context.filename, "hooks");
        if (relativePath === null) {
          return;
        }

        if (isAllowedHooksDirectoryRelativePath(relativePath, context.filename, filenameStyle)) {
          return;
        }

        context.report({
          node: readProgramReportNode(node),
          messageId: "invalidHooksDirectoryFile",
          data: { expectedHookFilePattern },
        });
      },
    };
  },
};

export default hooksDirectoryFileConventionRule;
