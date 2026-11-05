import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

type RuleDocs = {
  description: string;
  guidance: string;
};

type RuleMetaData = Omit<TSESLint.RuleMetaData<string>, "docs"> & {
  docs: RuleDocs;
};

export type RuleModule = Omit<TSESLint.RuleModule<string, readonly unknown[]>, "meta"> & {
  meta: RuleMetaData;
};
export type RuleContext = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;
export type RuleFixer = TSESLint.RuleFixer;

export type AstNode = TSESTree.Node;
export type AstProgram = TSESTree.Program;
export type AstProgramStatement = TSESTree.ProgramStatement;
export type AstExpression = TSESTree.Expression;
export type AstTypeDeclaration = TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration;
export type AstDestructuringPattern = TSESTree.DestructuringPattern;
export type AstDeclarationWithIdentifiers =
  | TSESTree.ClassDeclaration
  | TSESTree.FunctionDeclaration
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSImportEqualsDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSModuleDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.VariableDeclaration;
export type AstFunctionExpression = TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;
export type AstFunctionLike = TSESTree.FunctionDeclaration | AstFunctionExpression;
export type AstClassLike = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
export type AstImportClause = TSESTree.ImportClause;
export type AstExportSpecifier = TSESTree.ExportSpecifier;
export type AstImportDeclaration = TSESTree.ImportDeclaration;
export type AstExportNamedDeclaration = TSESTree.ExportNamedDeclaration;
export type AstVariableDeclaration = TSESTree.VariableDeclaration;
export type AstVariableDeclarator = TSESTree.VariableDeclarator;
export type AstSourceLocationNode = TSESTree.Node | TSESTree.Token;

export type RuntimeExportNameEntry = {
  name: string;
  reportNode: AstNode;
};
