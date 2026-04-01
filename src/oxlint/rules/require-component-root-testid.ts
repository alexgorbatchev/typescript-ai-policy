import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, AstProgramStatement, RuleContext, RuleModule } from "./types.ts";
import {
  isAstNode,
  isNestedClassNode,
  isNestedFunctionNode,
  isNullLiteral,
  isPascalCase,
  isTestIdAttributeName,
  readChildNodes,
  readJsxAttributeName,
  unwrapExpression,
} from "./helpers.ts";

type ComponentFunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;
type ComponentClassNode = TSESTree.ClassDeclaration;
type ComponentDefinition =
  | {
      isExported: boolean;
      kind: "class";
      name: string;
      node: ComponentClassNode;
    }
  | {
      isExported: boolean;
      kind: "function";
      name: string;
      node: ComponentFunctionNode;
    };
type TestIdEntry = {
  candidates: string[];
  node: TSESTree.JSXAttribute;
};
type RootBranch =
  | {
      kind: "fragment";
      node: TSESTree.JSXFragment;
      testIdEntries: TestIdEntry[];
    }
  | {
      kind: "jsx";
      node: TSESTree.JSXElement;
      testIdEntries: TestIdEntry[];
    }
  | {
      kind: "null";
      node: TSESTree.Literal;
      testIdEntries: TestIdEntry[];
    }
  | {
      kind: "other";
      node: TSESTree.Expression;
      summary: string;
      testIdEntries: TestIdEntry[];
    };

type ComponentDefinitionDeclaration =
  | TSESTree.ClassDeclaration
  | TSESTree.FunctionDeclaration
  | TSESTree.VariableDeclaration;
type ComponentDefinitionStatement = ComponentDefinitionDeclaration | AstProgramStatement;

const requireComponentRootTestIdRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce exported React component roots to use ComponentName and child test ids to use ComponentName--thing",
    },
    messages: {
      invalidChildTestId:
        'Rename this child test id to the "{{ componentName }}--thing" form, for example "{{ componentName }}--label". Received "{{ candidate }}".',
      exportedFragmentRoot:
        'Exported component "{{ componentName }}" must return a DOM element as its root, not a fragment. Wrap the fragment in an element with data-testid="{{ componentName }}".',
      exportedOtherRoot:
        'Exported component "{{ componentName }}" must render a DOM element as its root with data-testid="{{ componentName }}". Returning {{ summary }} is not allowed.',
      missingExportedRootTestId:
        'Add data-testid="{{ componentName }}" or testId="{{ componentName }}" to the exported component\'s root element.',
      invalidLocalRootTestId:
        'Rename the root test id of component "{{ componentName }}" to exactly "{{ componentName }}". Received "{{ candidate }}".',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        const componentDefinitions = readComponentDefinitions(program);

        componentDefinitions.forEach((componentDefinition) => {
          const rootBranches = readRootBranchesForComponent(componentDefinition);
          const rootNodes = new Set<TSESTree.JSXAttribute>();

          rootBranches.forEach((rootBranch) => {
            rootBranch.testIdEntries.forEach((testIdEntry) => {
              rootNodes.add(testIdEntry.node);
            });

            if (componentDefinition.isExported) {
              reportInvalidExportedRoot(context, componentDefinition.name, rootBranch);
              return;
            }

            reportInvalidLocalRoot(context, componentDefinition.name, rootBranch);
          });

          const componentTestIdEntries = readComponentTestIdEntries(componentDefinition);
          componentTestIdEntries.forEach((testIdEntry) => {
            if (rootNodes.has(testIdEntry.node)) {
              return;
            }

            testIdEntry.candidates.forEach((candidate) => {
              if (isValidChildTestId(candidate, componentDefinition.name)) {
                return;
              }

              context.report({
                node: testIdEntry.node,
                messageId: "invalidChildTestId",
                data: {
                  componentName: componentDefinition.name,
                  candidate,
                },
              });
            });
          });
        });
      },
    };
  },
};

export default requireComponentRootTestIdRule;

function readComponentDefinitions(program: AstProgram): ComponentDefinition[] {
  return program.body.flatMap((statement) => readStatementComponentDefinitions(statement));
}

function readStatementComponentDefinitions(statement: AstProgramStatement): ComponentDefinition[] {
  if (statement.type === "ExportNamedDeclaration") {
    return statement.declaration ? readDeclarationComponentDefinitions(statement.declaration, true) : [];
  }

  if (statement.type === "ExportDefaultDeclaration") {
    return readDefaultComponentDefinitions(statement.declaration, true);
  }

  return readDeclarationComponentDefinitions(statement, false);
}

function readDeclarationComponentDefinitions(
  declaration: ComponentDefinitionStatement,
  isExported: boolean,
): ComponentDefinition[] {
  if (declaration.type === "FunctionDeclaration") {
    if (!declaration.id || !isPascalCase(declaration.id.name)) {
      return [];
    }

    return [{ name: declaration.id.name, kind: "function", node: declaration, isExported }];
  }

  if (declaration.type === "ClassDeclaration") {
    if (!declaration.id || !isPascalCase(declaration.id.name)) {
      return [];
    }

    return [{ name: declaration.id.name, kind: "class", node: declaration, isExported }];
  }

  if (declaration.type !== "VariableDeclaration") {
    return [];
  }

  return declaration.declarations.flatMap((declarator) => {
    if (declarator.id.type !== "Identifier" || !isPascalCase(declarator.id.name)) {
      return [];
    }

    const componentNode = readWrappedFunctionLike(declarator.init);
    if (!componentNode) {
      return [];
    }

    return [{ name: declarator.id.name, kind: "function", node: componentNode, isExported }];
  });
}

function readDefaultComponentDefinitions(
  declaration: TSESTree.ExportDefaultDeclaration["declaration"],
  isExported: boolean,
): ComponentDefinition[] {
  if (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") {
    if (!declaration.id || !isPascalCase(declaration.id.name)) {
      return [];
    }

    return declaration.type === "FunctionDeclaration"
      ? [{ name: declaration.id.name, kind: "function", node: declaration, isExported }]
      : [{ name: declaration.id.name, kind: "class", node: declaration, isExported }];
  }

  if (
    declaration.type === "Identifier" ||
    declaration.type === "VariableDeclaration" ||
    declaration.type === "TSDeclareFunction" ||
    declaration.type === "TSEnumDeclaration" ||
    declaration.type === "TSInterfaceDeclaration" ||
    declaration.type === "TSModuleDeclaration" ||
    declaration.type === "TSTypeAliasDeclaration"
  ) {
    return [];
  }

  const componentNode = readWrappedFunctionLike(declaration);
  if (!componentNode || !componentNode.id || !isPascalCase(componentNode.id.name)) {
    return [];
  }

  return [{ name: componentNode.id.name, kind: "function", node: componentNode, isExported }];
}

function readWrappedFunctionLike(initializer: TSESTree.Expression | null | undefined): ComponentFunctionNode | null {
  if (!initializer) {
    return null;
  }

  if (initializer.type === "ArrowFunctionExpression" || initializer.type === "FunctionExpression") {
    return initializer;
  }

  if (initializer.type !== "CallExpression") {
    return null;
  }

  const wrappedInitializer = initializer.arguments[0];
  if (!wrappedInitializer || wrappedInitializer.type === "SpreadElement") {
    return null;
  }

  return readWrappedFunctionLike(wrappedInitializer);
}

function readRootBranchesForComponent(componentDefinition: ComponentDefinition): RootBranch[] {
  const returnExpressions =
    componentDefinition.kind === "class"
      ? readClassRenderReturnExpressions(componentDefinition.node)
      : readFunctionReturnExpressions(componentDefinition.node);

  return returnExpressions.flatMap((returnExpression) => readRootBranches(returnExpression));
}

function isRenderMethodDefinition(member: TSESTree.ClassElement): member is TSESTree.MethodDefinition {
  return (
    member.type === "MethodDefinition" &&
    !member.computed &&
    member.key.type === "Identifier" &&
    member.key.name === "render"
  );
}

function readClassRenderReturnExpressions(classDeclaration: ComponentClassNode): TSESTree.Expression[] {
  const renderMethod = classDeclaration.body.body.find(isRenderMethodDefinition);

  if (!renderMethod || !renderMethod.value.body) {
    return [];
  }

  return readReturnExpressionsFromBlock(renderMethod.value.body, renderMethod.value);
}

function readFunctionReturnExpressions(functionNode: ComponentFunctionNode): TSESTree.Expression[] {
  if (functionNode.body.type !== "BlockStatement") {
    return [functionNode.body];
  }

  return readReturnExpressionsFromBlock(functionNode.body, functionNode);
}

function readReturnExpressionsFromBlock(
  blockNode: TSESTree.BlockStatement,
  rootFunctionNode: TSESTree.Node,
): TSESTree.Expression[] {
  const returnExpressions: TSESTree.Expression[] = [];

  visitNode(blockNode);
  return returnExpressions;

  function visitNode(node: TSESTree.Node | null | undefined): void {
    if (!node) {
      return;
    }

    if (node !== rootFunctionNode && isNestedFunctionNode(node)) {
      return;
    }

    if (node !== rootFunctionNode && isNestedClassNode(node)) {
      return;
    }

    if (node.type === "ReturnStatement") {
      if (node.argument) {
        returnExpressions.push(node.argument);
      }
      return;
    }

    readChildNodes(node).forEach(visitNode);
  }
}

function readRootBranches(expression: TSESTree.Expression): RootBranch[] {
  const unwrappedExpression = unwrapExpression(expression);

  if (unwrappedExpression.type === "ConditionalExpression") {
    return [...readRootBranches(unwrappedExpression.consequent), ...readRootBranches(unwrappedExpression.alternate)];
  }

  if (unwrappedExpression.type === "LogicalExpression" && unwrappedExpression.operator === "&&") {
    return readRootBranches(unwrappedExpression.right);
  }

  if (isNullLiteral(unwrappedExpression)) {
    return [{ kind: "null", node: unwrappedExpression, testIdEntries: [] }];
  }

  if (unwrappedExpression.type === "JSXFragment") {
    return [{ kind: "fragment", node: unwrappedExpression, testIdEntries: [] }];
  }

  if (unwrappedExpression.type === "JSXElement") {
    return [
      {
        kind: "jsx",
        node: unwrappedExpression,
        testIdEntries: readJsxAttributeTestIdEntries(unwrappedExpression.openingElement.attributes),
      },
    ];
  }

  return [
    {
      kind: "other",
      node: unwrappedExpression,
      testIdEntries: [],
      summary: summarizeNode(unwrappedExpression),
    },
  ];
}

function readComponentTestIdEntries(componentDefinition: ComponentDefinition): TestIdEntry[] {
  const componentBody =
    componentDefinition.kind === "class"
      ? readClassRenderBody(componentDefinition.node)
      : componentDefinition.node.body;

  if (!componentBody || componentBody.type !== "BlockStatement") {
    return [];
  }

  return readTestIdEntriesFromNode(componentBody, componentBody);
}

function readClassRenderBody(classDeclaration: ComponentClassNode): TSESTree.BlockStatement | null {
  const renderMethod = classDeclaration.body.body.find(isRenderMethodDefinition);

  return renderMethod?.value.body ?? null;
}

function readTestIdEntriesFromNode(rootNode: TSESTree.Node, boundaryNode: TSESTree.Node): TestIdEntry[] {
  const testIdEntries: TestIdEntry[] = [];

  visitNode(rootNode);
  return testIdEntries;

  function visitNode(node: TSESTree.Node | null | undefined): void {
    if (!node) {
      return;
    }

    if (node !== boundaryNode && isNestedFunctionNode(node)) {
      return;
    }

    if (node !== boundaryNode && isNestedClassNode(node)) {
      return;
    }

    if (node.type === "JSXElement") {
      testIdEntries.push(...readJsxAttributeTestIdEntries(node.openingElement.attributes));
      node.children.forEach((childNode) => {
        if (isAstNode(childNode)) {
          visitNode(childNode);
        }
      });
      return;
    }

    readChildNodes(node).forEach(visitNode);
  }
}

function readJsxAttributeTestIdEntries(attributesNode: TSESTree.JSXOpeningElement["attributes"]): TestIdEntry[] {
  return attributesNode
    .filter((attribute): attribute is TSESTree.JSXAttribute => {
      return attribute.type === "JSXAttribute" && isTestIdAttributeName(readJsxAttributeName(attribute.name));
    })
    .map((attribute) => ({
      node: attribute,
      candidates: readTestIdCandidatesFromJsxAttribute(attribute),
    }));
}

function readTestIdCandidatesFromJsxAttribute(attribute: TSESTree.JSXAttribute): string[] {
  const initializer = attribute.value;
  if (!initializer) {
    return [];
  }

  if (initializer.type === "Literal" && typeof initializer.value === "string") {
    return [initializer.value];
  }

  if (initializer.type !== "JSXExpressionContainer" || initializer.expression.type === "JSXEmptyExpression") {
    return [];
  }

  return readExpressionStringCandidates(initializer.expression);
}

function readExpressionStringCandidates(expression: TSESTree.Expression): string[] {
  const unwrappedExpression = unwrapExpression(expression);

  if (unwrappedExpression.type === "Literal") {
    return typeof unwrappedExpression.value === "string" ? [unwrappedExpression.value] : [];
  }

  if (unwrappedExpression.type === "TemplateLiteral") {
    if (unwrappedExpression.expressions.length !== 0 || unwrappedExpression.quasis.length !== 1) {
      return [];
    }

    const cookedValue = unwrappedExpression.quasis[0]?.value.cooked;
    return typeof cookedValue === "string" ? [cookedValue] : [];
  }

  if (unwrappedExpression.type === "ConditionalExpression") {
    return [
      ...readExpressionStringCandidates(unwrappedExpression.consequent),
      ...readExpressionStringCandidates(unwrappedExpression.alternate),
    ];
  }

  return [];
}

function reportInvalidExportedRoot(context: RuleContext, componentName: string, rootBranch: RootBranch): void {
  if (rootBranch.kind === "null") {
    return;
  }

  if (rootBranch.kind === "fragment") {
    context.report({
      node: rootBranch.node,
      messageId: "exportedFragmentRoot",
      data: {
        componentName,
      },
    });
    return;
  }

  if (rootBranch.kind === "other") {
    context.report({
      node: rootBranch.node,
      messageId: "exportedOtherRoot",
      data: {
        componentName,
        summary: rootBranch.summary,
      },
    });
    return;
  }

  const hasExactRootTestId = rootBranch.testIdEntries.some((testIdEntry) => {
    return testIdEntry.candidates.some((candidate) => candidate === componentName);
  });

  if (hasExactRootTestId) {
    return;
  }

  context.report({
    node: rootBranch.testIdEntries[0]?.node ?? rootBranch.node,
    messageId: "missingExportedRootTestId",
    data: {
      componentName,
    },
  });
}

function reportInvalidLocalRoot(context: RuleContext, componentName: string, rootBranch: RootBranch): void {
  if (rootBranch.kind === "null" || rootBranch.testIdEntries.length === 0) {
    return;
  }

  rootBranch.testIdEntries.forEach((testIdEntry) => {
    testIdEntry.candidates.forEach((candidate) => {
      if (candidate === componentName) {
        return;
      }

      context.report({
        node: testIdEntry.node,
        messageId: "invalidLocalRootTestId",
        data: {
          componentName,
          candidate,
        },
      });
    });
  });
}

function isValidChildTestId(value: string, componentName: string): boolean {
  return new RegExp(`^${componentName}--[a-z0-9]+(?:-[a-z0-9]+)*$`, "u").test(value);
}

function summarizeNode(node: TSESTree.Node): string {
  const rawName = node.type.replace(/Expression$/u, " expression");
  return rawName.toLowerCase();
}
