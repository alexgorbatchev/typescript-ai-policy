import type { RuleModule } from "./types.ts";
import { isFixtureLikeName, isFixturesFile, readDeclarationIdentifierNames } from "./helpers.ts";

const noFixtureExportsOutsideFixtureEntrypointRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Disallow exporting fixture_ or factory_ bindings outside nested "fixtures.ts" or "fixtures.tsx" entrypoints under "__tests__/" or "stories/"',
    },
    schema: [],
    messages: {
      unexpectedFixtureExport:
        'Move "{{ name }}" into a nested "fixtures.ts" or "fixtures.tsx" entrypoint under "__tests__/" or "stories/" and export it only from there.',
    },
  },
  create(context) {
    if (isFixturesFile(context.filename)) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          readDeclarationIdentifierNames(node.declaration).forEach((name) => {
            if (!isFixtureLikeName(name)) {
              return;
            }

            context.report({
              node: node.declaration,
              messageId: "unexpectedFixtureExport",
              data: {
                name,
              },
            });
          });
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type !== "ExportSpecifier") {
            return;
          }

          const localName =
            specifier.local.type === "Identifier" ? specifier.local.name : String(specifier.local.value);
          const exportedName =
            specifier.exported.type === "Identifier" ? specifier.exported.name : String(specifier.exported.value);
          const fixtureLikeName = [exportedName, localName].find((name) => isFixtureLikeName(name));

          if (!fixtureLikeName) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedFixtureExport",
            data: {
              name: fixtureLikeName,
            },
          });
        });
      },
    };
  },
};

export default noFixtureExportsOutsideFixtureEntrypointRule;
