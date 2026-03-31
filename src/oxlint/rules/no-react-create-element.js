const noReactCreateElementRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Ban React createElement in regular application code; use JSX instead",
    },
    schema: [],
    messages: {
      noImportedCreateElement:
        'Remove the createElement import from "react" and rewrite the rendered output as JSX syntax.',
      noReactCreateElement: "Replace React.createElement(...) with equivalent JSX syntax.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source?.value !== "react") {
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type !== "ImportSpecifier") {
            return;
          }

          if (specifier.imported.type !== "Identifier" || specifier.imported.name !== "createElement") {
            return;
          }

          context.report({
            node: specifier,
            messageId: "noImportedCreateElement",
          });
        });
      },
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.computed ||
          node.callee.object.type !== "Identifier" ||
          node.callee.object.name !== "React" ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "createElement"
        ) {
          return;
        }

        context.report({
          node,
          messageId: "noReactCreateElement",
        });
      },
    };
  },
};

export default noReactCreateElementRule;
