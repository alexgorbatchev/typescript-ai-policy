import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgramStatement, RuleModule } from "./types.ts";
import { getBaseName } from "./helpers.ts";

type IndexMessageId = "unexpectedIndexExport" | "unexpectedIndexStatement";

function isIndexModuleFile(filename: string): boolean {
  const baseName = getBaseName(filename);

  return baseName === "index.ts" || baseName === "index.tsx";
}

function isIndexTsxFile(filename: string): boolean {
  return getBaseName(filename) === "index.tsx";
}

function isAllowedIndexReExport(node: AstProgramStatement): boolean {
  return (
    node.type === "ExportAllDeclaration" ||
    (node.type === "ExportNamedDeclaration" && node.source !== null && node.declaration === null)
  );
}

function readIndexBarrelBaseName(filename: string): string {
  return getBaseName(filename);
}

function readIndexRenameSuffix(filename: string): string {
  return isIndexTsxFile(filename) ? ' Then rename this file to "index.ts".' : "";
}

function readUnexpectedMessageId(node: AstProgramStatement): IndexMessageId {
  if (
    node.type === "ExportNamedDeclaration" ||
    node.type === "ExportDefaultDeclaration" ||
    node.type === "TSExportAssignment"
  ) {
    return "unexpectedIndexExport";
  }

  return "unexpectedIndexStatement";
}

function readVariableDeclarationReportNode(node: TSESTree.VariableDeclaration): TSESTree.Node {
  const firstDeclarator = node.declarations[0];
  return firstDeclarator?.id.type === "Identifier" ? firstDeclarator.id : node;
}

function readDeclarationStatementReportNode(statement: AstProgramStatement): TSESTree.Node | null {
  if (
    statement.type === "FunctionDeclaration" ||
    statement.type === "ClassDeclaration" ||
    statement.type === "TSEnumDeclaration" ||
    statement.type === "TSInterfaceDeclaration" ||
    statement.type === "TSTypeAliasDeclaration"
  ) {
    return statement.id ?? statement;
  }

  if (statement.type === "VariableDeclaration") {
    return readVariableDeclarationReportNode(statement);
  }

  return null;
}

function readExportDefaultReportNode(node: TSESTree.ExportDefaultDeclaration): TSESTree.Node {
  if (node.declaration.type === "Identifier") {
    return node.declaration;
  }

  if (
    node.declaration.type === "FunctionDeclaration" ||
    node.declaration.type === "ClassDeclaration" ||
    node.declaration.type === "TSEnumDeclaration" ||
    node.declaration.type === "TSInterfaceDeclaration" ||
    node.declaration.type === "TSTypeAliasDeclaration"
  ) {
    return node.declaration.id ?? node.declaration;
  }

  if (node.declaration.type === "VariableDeclaration") {
    return readVariableDeclarationReportNode(node.declaration);
  }

  return node;
}

function readProgramReportNode(node: TSESTree.Program): TSESTree.Node {
  return node.body[0] ?? node;
}

function readIndexViolationReportNode(statement: AstProgramStatement): TSESTree.Node {
  if (statement.type === "ExportNamedDeclaration") {
    if (statement.declaration) {
      if (
        statement.declaration.type === "FunctionDeclaration" ||
        statement.declaration.type === "ClassDeclaration" ||
        statement.declaration.type === "TSEnumDeclaration" ||
        statement.declaration.type === "TSInterfaceDeclaration" ||
        statement.declaration.type === "TSTypeAliasDeclaration"
      ) {
        return statement.declaration.id ?? statement.declaration;
      }

      if (statement.declaration.type === "VariableDeclaration") {
        return readVariableDeclarationReportNode(statement.declaration);
      }
    }

    const firstSpecifier = statement.specifiers[0];
    if (!firstSpecifier) {
      return statement;
    }

    return firstSpecifier.exported.type === "Identifier" ? firstSpecifier.exported : firstSpecifier;
  }

  if (statement.type === "ExportDefaultDeclaration") {
    return readExportDefaultReportNode(statement);
  }

  return readDeclarationStatementReportNode(statement) ?? statement;
}

const indexFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: 'Require "index.ts" files to contain re-exports only and forbid "index.tsx" barrels',
    },
    schema: [],
    messages: {
      unexpectedIndexTsxFilename:
        'Rename this file to "index.ts". Index barrel files must not use the ".tsx" extension.',
      unexpectedIndexExport:
        'Remove this local export from the index barrel. "{{ barrelBaseName }}" must not define symbols; move the definition into another module and re-export it from here instead{{ renameSuffix }}',
      unexpectedIndexStatement:
        'Remove this statement from the index barrel. "{{ barrelBaseName }}" may contain re-export statements only{{ renameSuffix }}',
    },
  },
  create(context) {
    if (!isIndexModuleFile(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        if (isIndexTsxFile(context.filename)) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "unexpectedIndexTsxFilename",
          });
        }

        const reportData = {
          barrelBaseName: readIndexBarrelBaseName(context.filename),
          renameSuffix: readIndexRenameSuffix(context.filename),
        };

        node.body.forEach((statement) => {
          if (isAllowedIndexReExport(statement)) {
            return;
          }

          context.report({
            node: readIndexViolationReportNode(statement),
            messageId: readUnexpectedMessageId(statement),
            data: reportData,
          });
        });
      },
    };
  },
};

export default indexFileContractRule;
