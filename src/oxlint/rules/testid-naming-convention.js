import { getComponentNameFromAncestors, getFilenameWithoutExtension } from "./helpers.js";

const testIdNamingConventionRule = {
  meta: {
    type: /** @type {const} */ ("suggestion"),
    docs: {
      description: "Enforce React test ids to use ComponentName for roots and ComponentName--thing for children",
      category: "Best Practices",
      recommended: false,
    },
    messages: {
      invalidTestId:
        'Rename {{ attributeName }} to "{{ componentName }}" on the component root, or to "{{ componentName }}--thing" on child elements. Received "{{ candidate }}".',
    },
    schema: [],
    fixable: /** @type {const} */ ("code"),
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const attributeName = node.name.name;
        if (attributeName !== "testId" && attributeName !== "data-testid") {
          return;
        }

        const attributeValue = node.value && node.value.value;
        if (!attributeValue) {
          return;
        }

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

              return fixer.replaceText(node.value, `"${newValue}"`);
            },
          });
        }
      },
    };
  },
};

export default testIdNamingConventionRule;
