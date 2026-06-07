import type { RuleModule } from "./types.ts";
import type { TSESTree } from "@typescript-eslint/types";

const ARBITRARY_CHILD_SELECTOR_REGEX = /\[&[^\s]*[_>~+*]/;

type TargetNode = TSESTree.Literal | TSESTree.TemplateElement;

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
      description:
        "Ban arbitrary child and sibling selectors in className and class attributes, and in string constants",
      guidance:
        "Do not use arbitrary child or sibling selectors to style nested descendants or siblings from the outside. Add proper variant props or sub-component slots to the target component instead.",
    },
    schema: [],
    messages: {
      noArbitraryChildSelector:
        "Use explicit variant props or visual primitives on components instead of arbitrary selectors.",
    },
  },
  create(context) {
    const reportedAttributes = new Set<TSESTree.JSXAttribute>();

    function checkNode(node: TargetNode, value: string) {
      if (ARBITRARY_CHILD_SELECTOR_REGEX.test(value)) {
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
