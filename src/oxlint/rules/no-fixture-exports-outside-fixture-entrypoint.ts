import type { RuleModule } from "./types.ts";
import { isFixtureLikeName, isFixturesFile, readDeclarationIdentifierNames } from "./helpers.ts";

const noFixtureExportsOutsideFixtureEntrypointRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow exporting fixture_ or factory_ bindings outside the __tests__/fixtures or stories/fixtures entrypoint",
    },
    schema: [],
    messages: {
      unexpectedFixtureExport:
        'Move "{{ name }}" into a fixture entrypoint under "__tests__/fixtures" or "stories/fixtures" ("fixtures.ts" or "fixtures.tsx") and export it only from there.',
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
