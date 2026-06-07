import {
  isInComponentOwnershipDirectory,
  isIntrinsicElementName,
  isStoryOrTestTsxFile,
  readChildNodes,
} from "./helpers.ts";
import type { RuleModule } from "./types.ts";
import type { TSESTree } from "@typescript-eslint/types";

function isLayoutStylingAttribute(attr: TSESTree.JSXAttribute): boolean {
  const isLayoutString = (str: string) => /\b(flex|grid|inline-flex|inline-grid)\b/u.test(str);

  const hasLayoutWord = (node: TSESTree.Node): boolean => {
    if (node.type === "Literal" && typeof node.value === "string") {
      return isLayoutString(node.value);
    }
    if (node.type === "TemplateElement") {
      const value = node.value.cooked ?? node.value.raw;
      return isLayoutString(value);
    }
    for (const child of readChildNodes(node)) {
      if (hasLayoutWord(child)) {
        return true;
      }
    }
    return false;
  };

  return attr.value ? hasLayoutWord(attr.value) : false;
}

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
      noStyledWrapperOfCustomComponent:
        "Use explicit variant props or layouts instead of wrapping custom components in styled elements.",
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (isStoryOrTestTsxFile(context.filename)) {
          return;
        }

        if (!isIntrinsicElementName(node.openingElement.name)) {
          return;
        }

        const stylingAttribute = node.openingElement.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            (attr.name.name === "className" || attr.name.name === "style"),
        );
        if (!stylingAttribute) {
          return;
        }

        if (isLayoutStylingAttribute(stylingAttribute)) {
          return;
        }

        const activeChildren = node.children.filter((child) => {
          if (child.type === "JSXText") {
            return child.value.trim() !== "";
          }
          return true;
        });

        if (activeChildren.length !== 1) {
          return;
        }

        const singleChild = activeChildren[0];
        if (
          singleChild &&
          singleChild.type === "JSXElement" &&
          !isIntrinsicElementName(singleChild.openingElement.name)
        ) {
          context.report({
            node: stylingAttribute.name,
            messageId: "noStyledWrapperOfCustomComponent",
          });
        }
      },
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
