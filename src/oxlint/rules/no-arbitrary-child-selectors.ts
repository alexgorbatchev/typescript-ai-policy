import { readChildNodes } from "./helpers.ts";
import type { RuleModule } from "./types.ts";
import type { TSESTree } from "@typescript-eslint/types";

const ARBITRARY_CHILD_SELECTOR_REGEX = /\[&[^\s]*[_>~+]/;

function hasArbitraryChildSelector(node: TSESTree.Node): boolean {
  if (node.type === "Literal" && typeof node.value === "string") {
    return ARBITRARY_CHILD_SELECTOR_REGEX.test(node.value);
  }

  if (node.type === "TemplateElement") {
    const value = node.value.cooked ?? node.value.raw;
    return ARBITRARY_CHILD_SELECTOR_REGEX.test(value);
  }

  for (const child of readChildNodes(node)) {
    if (hasArbitraryChildSelector(child)) {
      return true;
    }
  }

  return false;
}

const noArbitraryChildSelectorsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban arbitrary child and sibling selectors in className and class attributes",
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
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (node.name.name !== "className" && node.name.name !== "class") {
          return;
        }

        if (node.value && hasArbitraryChildSelector(node.value)) {
          context.report({
            node: node.name,
            messageId: "noArbitraryChildSelector",
          });
        }
      },
    };
  },
};

export default noArbitraryChildSelectorsRuleModule;
