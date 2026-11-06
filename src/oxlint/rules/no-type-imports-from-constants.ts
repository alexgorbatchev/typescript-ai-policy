import type { AstImportClause, AstImportDeclaration, AstNode, RuleContext, RuleModule } from "./types.ts";
import { hasBaseName, readLiteralStringValue } from "./helpers.ts";

function isTypeQueryRoot(identifier: AstNode): boolean {
  let node = identifier;
  while (node.parent?.type === "TSQualifiedName" && node.parent.left === node) {
    node = node.parent;
  }

  return node.parent?.type === "TSTypeQuery" && node.parent.exprName === node;
}

function isExclusiveValueQueryImport(specifier: AstImportClause, context: RuleContext): boolean {
  if (specifier.type !== "ImportSpecifier") {
    return false;
  }

  const [variable] = context.sourceCode.getDeclaredVariables(specifier);
  return (
    variable !== undefined &&
    variable.defs.length === 1 &&
    variable.defs[0]?.node === specifier &&
    variable.references.length > 0 &&
    variable.references.every((reference) => reference.resolved === variable && isTypeQueryRoot(reference.identifier))
  );
}

function isTypeImportSpecifier(specifier: AstImportClause, importDeclaration: AstImportDeclaration): boolean {
  return (
    importDeclaration.importKind === "type" || (specifier.type === "ImportSpecifier" && specifier.importKind === "type")
  );
}

const noTypeImportsFromConstantsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: 'Allow erased named imports from "constants" only for exclusive typeof value queries',
      guidance:
        "Keep `constants.ts` value-only and import declared types from their owning type modules. Named `import type` bindings from constants are allowed when every resolved reference is a `typeof` value query; run TypeScript checking to verify the imported export is a value.",
    },
    schema: [],
    messages: {
      unexpectedInlineTypeImport:
        "Use a named erased import for typeof queries of runtime constants. Import declared types from their owning types module.",
      unexpectedTypeImport:
        "Import declared types from their owning types module. Use an erased named import from constants only when every reference is a typeof value query.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = readLiteralStringValue(node.source);
        if (!importPath || !hasBaseName(importPath, "constants")) {
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (!isTypeImportSpecifier(specifier, node) || isExclusiveValueQueryImport(specifier, context)) {
            return;
          }

          context.report({
            node: specifier,
            messageId: "unexpectedTypeImport",
          });
        });
      },
      TSImportType(node) {
        const importPath = readLiteralStringValue(node.source);
        if (!importPath || !hasBaseName(importPath, "constants")) {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedInlineTypeImport",
        });
      },
    };
  },
};

export default noTypeImportsFromConstantsRule;
