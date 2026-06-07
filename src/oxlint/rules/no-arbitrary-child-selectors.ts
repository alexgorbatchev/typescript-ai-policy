import type { RuleModule } from "./types.ts";

const ARBITRARY_CHILD_SELECTOR_REGEX = /\[&[^\s]*[_>~+]/;

const noArbitraryChildSelectorsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban arbitrary child and sibling selectors in Tailwind/CSS classes",
      guidance:
        "Do not use arbitrary child or sibling selectors to style nested descendants or siblings. Use composition with separate components or explicit visual primitives instead.",
    },
    schema: [],
    messages: {
      noArbitraryChildSelector:
        "Use composition or explicit primitives instead of targeting descendants or siblings with arbitrary selectors.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string" && ARBITRARY_CHILD_SELECTOR_REGEX.test(node.value)) {
          context.report({
            node,
            messageId: "noArbitraryChildSelector",
          });
        }
      },
      TemplateElement(node) {
        const value = node.value.cooked ?? node.value.raw;
        if (ARBITRARY_CHILD_SELECTOR_REGEX.test(value)) {
          context.report({
            node,
            messageId: "noArbitraryChildSelector",
          });
        }
      },
    };
  },
};

export default noArbitraryChildSelectorsRuleModule;
