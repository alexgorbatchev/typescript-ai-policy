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
        "Keep component ownership files in the allowed location for their role. Move misplaced component files into the canonical component-owned area.",
    },
    schema: [],
    messages: {
      unexpectedComponentFileLocation:
        'Move this ".tsx" ownership file under a "components", "templates", or "layouts" directory. Keep non-component file roles out of the component ownership surface.',
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
