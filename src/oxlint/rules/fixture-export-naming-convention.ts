import type { RuleModule } from "./types.ts";
import { isFactoryFunctionName, isFixtureConstName, isFixturesFile } from "./helpers.ts";

const fixtureExportNamingConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce fixture_ and factory_ lowerCamelCase export names in the __tests__/fixtures or stories/fixtures entrypoint",
    },
    schema: [],
    messages: {
      invalidFactoryExportName:
        'Rename this factory export to the "factory_<lowerCamelCase>" form. Received "{{ name }}".',
      invalidFixtureExportName:
        'Rename this fixture export to the "fixture_<lowerCamelCase>" form. Received "{{ name }}".',
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

        if (declaration.type !== "FunctionDeclaration" || !declaration.id) {
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
