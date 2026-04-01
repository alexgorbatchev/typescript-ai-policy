import { isFixtureConsumerFile, isFixtureLikeName, readPatternIdentifierNames } from "./helpers.js";

const noInlineFixtureBindingsInTestsRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Disallow inline fixture_ and factory_ bindings inside test and story files",
    },
    schema: [],
    messages: {
      unexpectedInlineFixtureBinding:
        'Delete the inline "{{ name }}" declaration from this file and import it from the colocated "./fixtures" module instead.',
    },
  },
  create(context) {
    if (!isFixtureConsumerFile(context.filename)) {
      return {};
    }

    return {
      FunctionDeclaration(node) {
        if (!node.id || !isFixtureLikeName(node.id.name)) {
          return;
        }

        context.report({
          node: node.id,
          messageId: "unexpectedInlineFixtureBinding",
          data: {
            name: node.id.name,
          },
        });
      },
      VariableDeclarator(node) {
        readPatternIdentifierNames(node.id).forEach((name) => {
          if (!isFixtureLikeName(name)) {
            return;
          }

          context.report({
            node,
            messageId: "unexpectedInlineFixtureBinding",
            data: {
              name,
            },
          });
        });
      },
    };
  },
};

export default noInlineFixtureBindingsInTestsRule;
