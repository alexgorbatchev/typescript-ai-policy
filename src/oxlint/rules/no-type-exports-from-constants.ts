import type { AstExportNamedDeclaration, AstExportSpecifier, RuleModule } from "./types.ts";
import { hasBaseName, readDeclarationIdentifierNames, readLiteralStringValue } from "./helpers.ts";

function readExportedSpecifierName(specifier: AstExportSpecifier): string {
  if (specifier.exported.type === "Identifier") {
    return specifier.exported.name;
  }

  return String(specifier.exported.value);
}

function isTypeExportSpecifier(specifier: AstExportSpecifier, exportDeclaration: AstExportNamedDeclaration): boolean {
  return exportDeclaration.exportKind === "type" || specifier.exportKind === "type";
}

const noTypeExportsFromConstantsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: 'Disallow exporting type-only API from files whose filename is "constants"',
    },
    schema: [],
    messages: {
      unexpectedTypeExport:
        'Move exported type "{{ name }}" out of this "constants" file and into a sibling "types.ts" module. "constants.ts" must export runtime values only.',
      unexpectedTypeExportAll:
        'Do not re-export types from "{{ exportPath }}" through a "constants" file. Re-export them from a sibling "types.ts" module instead.',
    },
  },
  create(context) {
    if (!hasBaseName(context.filename, "constants")) {
      return {};
    }

    return {
      ExportAllDeclaration(node) {
        if (node.exportKind !== "type") {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedTypeExportAll",
          data: {
            exportPath: readLiteralStringValue(node.source) ?? "this module",
          },
        });
      },
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          if (node.exportKind !== "type") {
            return;
          }

          const exportNames = readDeclarationIdentifierNames(node.declaration);
          if (exportNames.length === 0) {
            context.report({
              node: node.declaration,
              messageId: "unexpectedTypeExport",
              data: {
                name: "this binding",
              },
            });
            return;
          }

          exportNames.forEach((name) => {
            context.report({
              node: node.declaration,
              messageId: "unexpectedTypeExport",
              data: {
                name,
              },
            });
          });
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (!isTypeExportSpecifier(specifier, node)) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedTypeExport",
            data: {
              name: readExportedSpecifierName(specifier),
            },
          });
        });
      },
    };
  },
};

export default noTypeExportsFromConstantsRule;
