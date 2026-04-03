import type { RuleModule } from "./types.ts";
import { isFixtureConsumerFile, isFixtureLikeName, readPatternIdentifierNames } from "./helpers.ts";

const noInlineFixtureBindingsInTestsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow inline fixture_ and factory_ bindings inside test and story files",
    },
    schema: [],
    messages: {
      unexpectedInlineFixtureBinding:
        'Delete the inline "{{ name }}" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.',
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
