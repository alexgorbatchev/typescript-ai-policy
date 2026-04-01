import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

export type RuleModule = TSESLint.RuleModule<string, readonly unknown[]>;
export type RuleContext = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;
export type RuleFixer = TSESLint.RuleFixer;
export type RuleListener = TSESLint.RuleListener;

export type AstNode = TSESTree.Node;
export type AstProgram = TSESTree.Program;
export type AstProgramStatement = TSESTree.ProgramStatement;
export type AstStatement = TSESTree.Statement;
export type AstExpression = TSESTree.Expression;
export type AstLiteral = TSESTree.Literal;
export type AstTypeNode = TSESTree.TypeNode;
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
export type AstImportSpecifier = TSESTree.ImportSpecifier;
export type AstExportSpecifier = TSESTree.ExportSpecifier;
export type AstImportDeclaration = TSESTree.ImportDeclaration;
export type AstExportNamedDeclaration = TSESTree.ExportNamedDeclaration;
export type AstVariableDeclaration = TSESTree.VariableDeclaration;
export type AstVariableDeclarator = TSESTree.VariableDeclarator;
export type AstCallExpression = TSESTree.CallExpression;
export type AstMemberExpression = TSESTree.MemberExpression;
export type AstIdentifier = TSESTree.Identifier;
export type AstJsxAttribute = TSESTree.JSXAttribute;
export type AstJsxAttributeName = TSESTree.JSXAttribute["name"];
export type AstJsxAttributeValue = TSESTree.JSXAttribute["value"];
export type AstJsxAttributeList = TSESTree.JSXOpeningElement["attributes"];
export type AstProperty = TSESTree.Property;
export type AstSourceLocationNode = TSESTree.Node | TSESTree.Token;
