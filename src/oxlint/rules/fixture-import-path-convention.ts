import type { AstImportClause, RuleModule } from "./types.ts";
import { isAllowedFixturesImportPath, isFixtureConsumerFile, isFixtureLikeName } from "./helpers.ts";

type ImportSpecifierNames = {
  importedName: string | null;
  isNamedImport: boolean;
  localName: string;
};

function readImportSpecifierNames(specifier: AstImportClause): ImportSpecifierNames {
  if (specifier.type === "ImportSpecifier") {
    return {
      importedName:
        specifier.imported.type === "Identifier" ? specifier.imported.name : String(specifier.imported.value),
      localName: specifier.local.type === "Identifier" ? specifier.local.name : "",
      isNamedImport: true,
    };
  }

  return {
    importedName: null,
    localName: specifier.local.type === "Identifier" ? specifier.local.name : "",
    isNamedImport: false,
  };
}

const fixtureImportPathConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require test and story files to import fixture_ and factory_ bindings only as named imports from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree',
    },
    schema: [],
    messages: {
      invalidFixturesImportAlias:
        'Import "{{ name }}" from a relative "fixtures" module without renaming it. The local binding must stay "{{ name }}".',
      invalidFixturesImportName:
        'Only named imports that start with "fixture_" or "factory_" are allowed from a relative "fixtures" module. Remove or rename "{{ name }}".',
      invalidFixturesImportPath:
        'Change this import so "{{ name }}" comes from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree.',
      invalidFixturesImportStyle:
        'Rewrite this as a named import from a relative "fixtures" module, for example: import { fixture_name } from "./fixtures".',
    },
  },
  create(context) {
    if (!isFixtureConsumerFile(context.filename)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = typeof node.source.value === "string" ? node.source.value : "";

        if (isAllowedFixturesImportPath(importPath, context.filename)) {
          if (node.specifiers.length === 0) {
            context.report({
              node,
              messageId: "invalidFixturesImportStyle",
            });
            return;
          }

          node.specifiers.forEach((specifier) => {
            const { importedName, localName, isNamedImport } = readImportSpecifierNames(specifier);

            if (!isNamedImport) {
              context.report({
                node: specifier,
                messageId: "invalidFixturesImportStyle",
              });
              return;
            }

            if (!importedName || !isFixtureLikeName(importedName)) {
              context.report({
                node: specifier,
                messageId: "invalidFixturesImportName",
                data: {
                  name: importedName ?? localName,
                },
              });
              return;
            }

            if (localName !== importedName) {
              context.report({
                node: specifier,
                messageId: "invalidFixturesImportAlias",
                data: {
                  name: importedName,
                },
              });
            }
          });

          return;
        }

        node.specifiers.forEach((specifier) => {
          const { importedName, localName, isNamedImport } = readImportSpecifierNames(specifier);
          const fixtureLikeName = isNamedImport
            ? [importedName, localName].find((name) => typeof name === "string" && isFixtureLikeName(name))
            : isFixtureLikeName(localName)
              ? localName
              : null;

          if (!fixtureLikeName) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "invalidFixturesImportPath",
            data: {
              name: fixtureLikeName,
            },
          });
        });
      },
    };
  },
};

export default fixtureImportPathConventionRule;
