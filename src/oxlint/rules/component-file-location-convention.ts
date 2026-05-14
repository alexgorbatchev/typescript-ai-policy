import {
  COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
  getExtension,
  hasPathSegment,
  isInTestsDirectory,
  readProgramReportNode,
} from "./helpers.ts";
import type { RuleModule } from "./types.ts";

const componentFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require non-hook, non-test ".tsx" files to live under a "components", "templates", or "layouts" directory',
      guidance:
        'Keep non-hook, non-test ".tsx" ownership files under "components/", "templates/", or "layouts/". Move files for other roles to their canonical locations.',
    },
    schema: [],
    messages: {
      unexpectedComponentFileLocation:
        'Place non-hook, non-test ".tsx" ownership files under "components/", "templates/", or "layouts/".',
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

        if (
          COMPONENT_OWNERSHIP_DIRECTORY_NAMES.some((directoryName) => hasPathSegment(context.filename, directoryName))
        ) {
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
