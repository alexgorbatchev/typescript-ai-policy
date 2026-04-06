import type { RuleModule } from "./types.ts";
import { getExtension, hasPathSegment, isInTestsDirectory, readProgramReportNode } from "./helpers.ts";

const COMPONENT_DIRECTORY_NAMES = new Set(["components", "templates", "layouts"]);

const componentFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require non-hook, non-test ".tsx" files to live under a "components", "templates", or "layouts" directory',
    },
    schema: [],
    messages: {
      unexpectedComponentFileLocation:
        'Move this ".tsx" file under a "components", "templates", or "layouts" directory. Files inside "hooks/" and "__tests__/" are exempt from this placement rule.',
    },
  },
  create(context) {
    if (getExtension(context.filename) !== ".tsx") {
      return {};
    }

    return {
      Program(node) {
        if (isInTestsDirectory(context.filename) || hasPathSegment(context.filename, "hooks")) {
          return;
        }

        if ([...COMPONENT_DIRECTORY_NAMES].some((directoryName) => hasPathSegment(context.filename, directoryName))) {
          return;
        }

        context.report({
          node: readProgramReportNode(node),
          messageId: "unexpectedComponentFileLocation",
        });
      },
    };
  },
};

export default componentFileLocationConventionRule;
