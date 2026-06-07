import { isIntrinsicElementName, readChildNodes } from "./helpers.ts";
import type { RuleModule } from "./types.ts";
import type { TSESTree } from "@typescript-eslint/types";

const ARBITRARY_CUSTOM_COMPONENT_SELECTOR_REGEX = /\[&[^\s]*[A-Z][A-Za-z0-9]*/;
const ARBITRARY_CHILD_SELECTOR_REGEX = /\[&[^\s]*[_>~+*]/;
const CSS_VARIABLE_OVERRIDE_REGEX = /\[--[a-zA-Z0-9_-]+:/;

type TargetNode = TSESTree.Literal | TSESTree.TemplateElement;

function hasArbitraryChildSelectorRegex(node: TSESTree.Node, regex: RegExp): boolean {
  if (node.type === "Literal" && typeof node.value === "string") {
    return regex.test(node.value);
  }

  if (node.type === "TemplateElement") {
    const value = node.value.cooked ?? node.value.raw;
    return regex.test(value);
  }

  for (const child of readChildNodes(node)) {
    if (hasArbitraryChildSelectorRegex(child, regex)) {
      return true;
    }
  }

  return false;
}

function hasCssVariableStyleProperty(node: TSESTree.Node): boolean {
  if (node.type !== "JSXExpressionContainer" || node.expression.type !== "ObjectExpression") {
    return false;
  }
  return node.expression.properties.some((prop) => {
    if (prop.type !== "Property") return false;
    if (prop.key.type === "Identifier" && prop.key.name.startsWith("--")) return true;
    if (prop.key.type === "Literal" && typeof prop.key.value === "string" && prop.key.value.startsWith("--")) {
      return true;
    }
    return false;
  });
}

function findClassJSXAttribute(node: TSESTree.Node): TSESTree.JSXAttribute | null {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === "JSXAttribute" &&
      current.name.type === "JSXIdentifier" &&
      (current.name.name === "className" || current.name.name === "class")
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

const noArbitraryChildSelectorsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban arbitrary child and sibling selectors targeting custom components",
      guidance:
        "Do not use arbitrary child or sibling selectors to target custom components (such as targeting custom elements or nesting tags when wrapping a custom component). Add proper variant props or sub-component slots to the target component instead.",
    },
    schema: [],
    messages: {
      noArbitraryChildSelector:
        "Use explicit variant props or visual primitives on custom components instead of targeting them with arbitrary selectors.",
      noArbitraryChildSelectorOnCustomComponent:
        "Use explicit variant props on the custom component instead of targeting its nested descendants or overriding its custom properties from the outside.",
    },
  },
  create(context) {
    const reportedAttributes = new Set<TSESTree.JSXAttribute>();

    function checkNode(node: TargetNode, value: string) {
      if (ARBITRARY_CUSTOM_COMPONENT_SELECTOR_REGEX.test(value)) {
        const classAttribute = findClassJSXAttribute(node);
        if (classAttribute) {
          if (!reportedAttributes.has(classAttribute)) {
            reportedAttributes.add(classAttribute);
            context.report({
              node: classAttribute.name,
              messageId: "noArbitraryChildSelector",
            });
          }
        } else {
          context.report({
            node,
            messageId: "noArbitraryChildSelector",
          });
        }
      }
    }

    return {
      JSXElement(node) {
        if (!isIntrinsicElementName(node.openingElement.name)) {
          return;
        }

        const hasCustomComponentChild = node.children.some(
          (child) => child.type === "JSXElement" && !isIntrinsicElementName(child.openingElement.name),
        );
        if (!hasCustomComponentChild) {
          return;
        }

        const stylingAttribute = node.openingElement.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            (attr.name.name === "className" || attr.name.name === "class" || attr.name.name === "style"),
        );
        if (!stylingAttribute || !stylingAttribute.value) {
          return;
        }

        let isViolation = false;
        if (stylingAttribute.name.name === "style") {
          isViolation = hasCssVariableStyleProperty(stylingAttribute.value);
        } else {
          isViolation =
            hasArbitraryChildSelectorRegex(stylingAttribute.value, ARBITRARY_CHILD_SELECTOR_REGEX) ||
            hasArbitraryChildSelectorRegex(stylingAttribute.value, CSS_VARIABLE_OVERRIDE_REGEX);
        }

        if (isViolation) {
          context.report({
            node: stylingAttribute.name,
            messageId: "noArbitraryChildSelectorOnCustomComponent",
          });
        }
      },
      Literal(node) {
        if (typeof node.value === "string") {
          checkNode(node, node.value);
        }
      },
      TemplateElement(node) {
        const value = node.value.cooked ?? node.value.raw;
        checkNode(node, value);
      },
    };
  },
};

export default noArbitraryChildSelectorsRuleModule;
