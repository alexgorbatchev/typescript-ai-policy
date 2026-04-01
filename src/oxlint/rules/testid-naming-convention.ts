import type { RuleModule } from "./types.ts";
import { getComponentNameFromAncestors, getFilenameWithoutExtension, readJsxAttributeName } from "./helpers.ts";

const testIdNamingConventionRule: RuleModule = {
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Enforce React test ids to use ComponentName for roots and ComponentName--thing for children",
    },
    messages: {
      invalidTestId:
        'Rename {{ attributeName }} to "{{ componentName }}" on the component root, or to "{{ componentName }}--thing" on child elements. Received "{{ candidate }}".',
    },
    schema: [],
    fixable: "code" as const,
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const attributeName = readJsxAttributeName(node.name);
        if (attributeName !== "testId" && attributeName !== "data-testid") {
          return;
        }

        if (node.value?.type !== "Literal" || typeof node.value.value !== "string") {
          return;
        }

        const literalValue = node.value;
        const attributeValue = literalValue.value;

        const componentName = getComponentNameFromAncestors(node) || getFilenameWithoutExtension(context.filename);
        const expectedFormat = `${componentName}--`;

        if (attributeValue !== componentName && !attributeValue.startsWith(expectedFormat)) {
          context.report({
            node,
            messageId: "invalidTestId",
            data: {
              attributeName,
              candidate: attributeValue,
              componentName,
            },
            fix(fixer) {
              let newValue;
              const parts = attributeValue.split("--");

              if (parts.length > 1) {
                newValue = `${expectedFormat}${parts.slice(1).join("--")}`;
              } else {
                newValue = `${expectedFormat}${attributeValue}`;
              }

              return fixer.replaceText(literalValue, `"${newValue}"`);
            },
          });
        }
      },
    };
  },
};

export default testIdNamingConventionRule;
