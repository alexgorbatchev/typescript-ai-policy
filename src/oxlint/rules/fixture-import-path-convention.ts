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
      guidance:
        "Import fixtures through the canonical fixture entrypoint path. Do not reach into private fixture implementation files.",
    },
    schema: [],
    messages: {
      invalidFixturesImportAlias: 'Import fixture bindings from relative "fixtures" modules without renaming them.',
      invalidFixturesImportName:
        'Import only named "fixture_*" or "factory_*" bindings from relative "fixtures" modules.',
      invalidFixturesImportPath:
        'Import fixture bindings from relative "fixtures" modules in the same "__tests__/" or "stories/" tree.',
      invalidFixturesImportStyle: 'Use named imports from relative "fixtures" modules.',
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
              });
              return;
            }

            if (localName !== importedName) {
              context.report({
                node: specifier,
                messageId: "invalidFixturesImportAlias",
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
          });
        });
      },
    };
  },
};

export default fixtureImportPathConventionRule;
