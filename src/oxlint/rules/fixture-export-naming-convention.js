import { isFactoryFunctionName, isFixtureConstName, isFixturesFile } from "./helpers.js";

const fixtureExportNamingConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Enforce fixture_ and factory_ lowerCamelCase export names in the __tests__/fixtures entrypoint",
    },
    schema: [],
    messages: {
      invalidFactoryExportName:
        'Factory exports in the __tests__/fixtures entrypoint must be named "factory_<lowerCamelCase>". Received "{{ name }}".',
      invalidFixtureExportName:
        'Fixture exports in the __tests__/fixtures entrypoint must be named "fixture_<lowerCamelCase>". Received "{{ name }}".',
    },
  },
  create(context) {
    if (!isFixturesFile(context.filename)) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration) {
          return;
        }

        if (declaration.type === "VariableDeclaration" && declaration.kind === "const") {
          declaration.declarations.forEach((declarator) => {
            if (declarator.id.type !== "Identifier") {
              return;
            }

            if (isFixtureConstName(declarator.id.name)) {
              return;
            }

            context.report({
              node: declarator.id,
              messageId: "invalidFixtureExportName",
              data: {
                name: declarator.id.name,
              },
            });
          });
          return;
        }

        if (declaration.type !== "FunctionDeclaration" || !declaration.id || declaration.declare === true) {
          return;
        }

        if (isFactoryFunctionName(declaration.id.name)) {
          return;
        }

        context.report({
          node: declaration.id,
          messageId: "invalidFactoryExportName",
          data: {
            name: declaration.id.name,
          },
        });
      },
    };
  },
};

export default fixtureExportNamingConventionRule;
