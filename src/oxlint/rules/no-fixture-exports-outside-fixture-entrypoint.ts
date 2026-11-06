import type { RuleModule } from "./types.ts";
import {
  isAllowedFixturesReExportPath,
  isFixtureLikeName,
  isFixturesBarrelFile,
  isFixturesFile,
  isFixturesReExportPath,
  readDeclarationIdentifierNames,
} from "./helpers.ts";

const noFixtureExportsOutsideFixtureEntrypointRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Keep fixture declarations in nested "fixtures.ts[x]" files and allow only owned re-exports from "fixtures/index.ts" under "__tests__/" or "stories/"',
      guidance:
        "Declare shared fixtures in `fixtures.ts[x]` under `__tests__` or `stories`. A `fixtures/index.ts` barrel may re-export its own nested declaration files with unchanged named exports or bare wildcards; keep fixture exports inside that area.",
    },
    schema: [],
    messages: {
      unexpectedFixtureExport:
        'Declare fixtures in nested "fixtures.ts[x]" files under "__tests__/" or "stories/". Re-export them only from their owning "fixtures/index.ts" barrel with unchanged names or a bare wildcard.',
    },
  },
  create(context) {
    if (isFixturesFile(context.filename)) {
      return {};
    }

    const isFixtureBarrel = isFixturesBarrelFile(context.filename);

    return {
      ExportAllDeclaration(node) {
        const exportPath = node.source.value;
        if (!isFixtureBarrel && !isFixturesReExportPath(exportPath, context.filename)) {
          return;
        }

        if (
          !node.exported &&
          node.exportKind === "value" &&
          isAllowedFixturesReExportPath(exportPath, context.filename)
        ) {
          return;
        }

        context.report({ node, messageId: "unexpectedFixtureExport" });
      },
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          readDeclarationIdentifierNames(node.declaration).forEach((name) => {
            if (!isFixtureLikeName(name)) {
              return;
            }

            context.report({
              node: node.declaration,
              messageId: "unexpectedFixtureExport",
            });
          });
        }

        const exportPath = node.source?.value;
        const isFixtureSource = exportPath !== undefined && isFixturesReExportPath(exportPath, context.filename);
        const isOwnedSource = exportPath !== undefined && isAllowedFixturesReExportPath(exportPath, context.filename);

        node.specifiers.forEach((specifier) => {
          if (specifier.type !== "ExportSpecifier") {
            return;
          }

          const localName =
            specifier.local.type === "Identifier" ? specifier.local.name : String(specifier.local.value);
          const exportedName =
            specifier.exported.type === "Identifier" ? specifier.exported.name : String(specifier.exported.value);
          if (
            isOwnedSource &&
            node.exportKind === "value" &&
            specifier.exportKind === "value" &&
            isFixtureLikeName(localName) &&
            localName === exportedName
          ) {
            return;
          }

          if (
            !isFixtureBarrel &&
            !isFixtureSource &&
            !isFixtureLikeName(localName) &&
            !isFixtureLikeName(exportedName)
          ) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedFixtureExport",
          });
        });
      },
    };
  },
};

export default noFixtureExportsOutsideFixtureEntrypointRule;
