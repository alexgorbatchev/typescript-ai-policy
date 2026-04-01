import type { TSESTree } from "@typescript-eslint/types";
import type { RuleContext, RuleModule } from "./types.ts";
import { isInTestsDirectory, isTestsDirectoryPath } from "./helpers.ts";

type StringLiteralValueNode = TSESTree.Expression | TSESTree.Literal | null | undefined;

function readStringLiteralValue(node: StringLiteralValueNode): string | null {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? null;
  }

  return null;
}

function reportUnexpectedTestsDirectoryImport(context: RuleContext, node: TSESTree.Node, importPath: string): void {
  context.report({
    node,
    messageId: "unexpectedTestsDirectoryImport",
    data: {
      importPath,
    },
  });
}

const noImportsFromTestsDirectoryRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Disallow files outside "__tests__" from importing, requiring, or re-exporting modules from a "__tests__" directory',
    },
    schema: [],
    messages: {
      unexpectedTestsDirectoryImport:
        'Remove this dependency on "{{ importPath }}". Files outside "__tests__" must not import, require, or re-export modules from a "__tests__" directory.',
    },
  },
  create(context) {
    if (isInTestsDirectory(context.filename)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importPath = readStringLiteralValue(node.source);
        if (!importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, node.source, importPath);
      },
      ExportNamedDeclaration(node) {
        const source = node.source;
        const importPath = readStringLiteralValue(source);
        if (!source || !importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, source, importPath);
      },
      ExportAllDeclaration(node) {
        const importPath = readStringLiteralValue(node.source);
        if (!importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, node.source, importPath);
      },
      ImportExpression(node) {
        const importPath = readStringLiteralValue(node.source);
        if (!importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, node.source, importPath);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "require") {
          return;
        }

        const firstArgument = node.arguments[0];
        if (!firstArgument || firstArgument.type === "SpreadElement") {
          return;
        }

        const importPath = readStringLiteralValue(firstArgument);
        if (!importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, firstArgument, importPath);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type !== "TSExternalModuleReference") {
          return;
        }

        const importPath = readStringLiteralValue(node.moduleReference.expression);
        if (!importPath || !isTestsDirectoryPath(importPath)) {
          return;
        }

        reportUnexpectedTestsDirectoryImport(context, node.moduleReference.expression, importPath);
      },
    };
  },
};

export default noImportsFromTestsDirectoryRule;
