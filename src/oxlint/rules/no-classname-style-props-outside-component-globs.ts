import { isInComponentOwnershipDirectory, isStoryOrTestTsxFile } from "./helpers.ts";
import type { RuleModule } from "./types.ts";

const noClassNameStylePropsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban className and style props outside canonical component areas in TSX files",
      guidance:
        "Keep `className` and `style` props only in component-owned TSX files inside canonical component areas. Expose variants or styling APIs instead of passing styling props outside that surface.",
    },
    schema: [],
    messages: {
      noClassNameOrStylePropOutsideComponentDirectory:
        "Move styling into a component ownership file. Expose necessary variants instead of passing styling props here.",
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
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (node.name.name !== "className" && node.name.name !== "style") {
          return;
        }

        context.report({
          node: node.name,
          messageId: "noClassNameOrStylePropOutsideComponentDirectory",
        });
      },
    };
  },
};

export default noClassNameStylePropsOutsideComponentGlobsRuleModule;
