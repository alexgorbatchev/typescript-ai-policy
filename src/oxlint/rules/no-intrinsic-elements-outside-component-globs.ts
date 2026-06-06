import {
  COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
  isInComponentOwnershipDirectory,
  isIntrinsicElementName,
  isStoryOrTestTsxFile,
} from "./helpers.ts";
import type { RuleModule } from "./types.ts";

const COMPONENT_OWNERSHIP_DIRECTORIES = COMPONENT_OWNERSHIP_DIRECTORY_NAMES.map(
  (directoryName) => `"${directoryName}/"`,
)
  .join(", ")
  .replace(/, ([^,]+)$/u, ", or $1");

const NO_INTRINSIC_ELEMENTS_OUTSIDE_COMPONENT_GLOBS_MESSAGE = `Raw DOM markup only allowed inside component ownership files in ${COMPONENT_OWNERSHIP_DIRECTORIES}.`;

const noIntrinsicElementsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban intrinsic JSX elements outside canonical component areas in TSX files",
      guidance: `Keep raw intrinsic JSX only in component-owned TSX files inside "components/", "templates/", or "layouts/". Outside that surface, compose imported components instead of writing DOM markup directly.`,
    },
    schema: [],
    messages: {
      noIntrinsicElementOutsideComponentDirectory: NO_INTRINSIC_ELEMENTS_OUTSIDE_COMPONENT_GLOBS_MESSAGE,
    },
  },
  create(context) {
    if (isStoryOrTestTsxFile(context.filename)) {
      return {};
    }

    if (isInComponentOwnershipDirectory(context.filename)) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        if (!isIntrinsicElementName(node.name)) {
          return;
        }

        context.report({
          node: node.name,
          messageId: "noIntrinsicElementOutsideComponentDirectory",
        });
      },
    };
  },
};

export default noIntrinsicElementsOutsideComponentGlobsRuleModule;
