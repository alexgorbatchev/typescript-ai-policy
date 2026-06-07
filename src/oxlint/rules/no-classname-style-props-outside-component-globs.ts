import { isInComponentOwnershipDirectory, isIntrinsicElementName, isStoryOrTestTsxFile } from "./helpers.ts";
import type { RuleModule } from "./types.ts";

const noClassNameStylePropsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban className and style props outside canonical component areas in TSX files, and ban them on custom components everywhere",
      guidance:
        "Keep `className` and `style` props only on raw HTML elements inside component-owned TSX files in canonical component areas. Custom/capitalized components must not accept `className` or `style` props in any file.",
    },
    schema: [],
    messages: {
      noClassNameOrStylePropOutsideComponentDirectory:
        "Move styling into a component ownership file. Expose necessary variants instead of passing styling props here.",
      noClassNameOrStylePropOnCustomComponent:
        "Use layout components or variant props instead of passing className or style.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (node.name.name !== "className" && node.name.name !== "style") {
          return;
        }

        const openingElement = node.parent;
        if (!openingElement || openingElement.type !== "JSXOpeningElement") {
          return;
        }

        const isCustomComponent = !isIntrinsicElementName(openingElement.name);

        if (isCustomComponent) {
          context.report({
            node: node.name,
            messageId: "noClassNameOrStylePropOnCustomComponent",
          });
          return;
        }

        if (isStoryOrTestTsxFile(context.filename)) {
          return;
        }

        if (isInComponentOwnershipDirectory(context.filename)) {
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
