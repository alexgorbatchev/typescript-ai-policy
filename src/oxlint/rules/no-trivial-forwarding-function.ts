import type { TSESTree } from "@typescript-eslint/types";
import type { RuleContext, RuleModule } from "./types.ts";
import { isAstNode } from "./helpers.ts";

type ForwardingArgumentNode = TSESTree.CallExpressionArgument | TSESTree.Expression;
type PropertyKeyNode = TSESTree.Expression | TSESTree.PrivateIdentifier;
type SupportedFunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

type ForwardingAnalysis = {
  forwardedParameterNames: string[];
  hasExternalTarget: boolean;
  isForwarding: boolean;
};

function readParentNode(node: TSESTree.Node): TSESTree.Node | undefined {
  const parentNode: unknown = Reflect.get(node, "parent");

  return isAstNode(parentNode) ? parentNode : undefined;
}

function readReportNode(node: SupportedFunctionNode): TSESTree.Node {
  if (node.type === "FunctionDeclaration" && node.id) {
    return node.id;
  }

  const parentNode = readParentNode(node);
  if (parentNode?.type === "VariableDeclarator" && parentNode.id.type === "Identifier") {
    return parentNode.id;
  }

  return node;
}

function readFunctionName(node: SupportedFunctionNode): string | null {
  if (node.type === "FunctionDeclaration" && node.id) {
    return node.id.name;
  }

  const parentNode = readParentNode(node);
  if (parentNode?.type === "VariableDeclarator" && parentNode.id.type === "Identifier") {
    return parentNode.id.name;
  }

  return null;
}

function isSupportedFunctionNode(node: SupportedFunctionNode): boolean {
  if (node.type === "FunctionDeclaration") {
    return true;
  }

  const parentNode = readParentNode(node);
  return parentNode?.type === "VariableDeclarator" || parentNode?.type === "ExportDefaultDeclaration";
}

function readReturnedExpression(node: SupportedFunctionNode): TSESTree.Expression | null {
  if (node.body.type !== "BlockStatement") {
    return node.body;
  }

  if (node.body.body.length !== 1) {
    return null;
  }

  const onlyStatement = node.body.body[0];
  if (onlyStatement?.type !== "ReturnStatement" || onlyStatement.argument === null) {
    return null;
  }

  return onlyStatement.argument;
}

function readForwardedParameterName(parameter: TSESTree.Parameter): string | null {
  if (parameter.type === "Identifier") {
    return parameter.name;
  }

  if (parameter.type === "RestElement" && parameter.argument.type === "Identifier") {
    return parameter.argument.name;
  }

  return null;
}

function readForwardedParameterNames(node: SupportedFunctionNode): readonly string[] | null {
  const parameterNames: string[] = [];

  for (const parameter of node.params) {
    const parameterName = readForwardedParameterName(parameter);
    if (parameterName === null) {
      return null;
    }

    parameterNames.push(parameterName);
  }

  return parameterNames;
}

function unwrapChainExpression(node: TSESTree.Expression): TSESTree.Expression {
  return node.type === "ChainExpression" ? node.expression : node;
}

function readIdentifierWords(identifierName: string): readonly string[] {
  const normalizedIdentifierName = identifierName
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replaceAll(/[_-]+/gu, " ")
    .toLowerCase();

  return normalizedIdentifierName.split(/\s+/u).filter((word) => word.length > 0);
}

function isLiteralPropertyKey(node: PropertyKeyNode): boolean {
  return node.type === "Literal";
}

function readSelectedPropertyName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }

  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string") {
    return node.property.value;
  }

  return null;
}

function doesFunctionNameRestateSelectedProperty(functionName: string, selectedPropertyName: string): boolean {
  const functionNameWords = readIdentifierWords(functionName);
  const selectedPropertyWords = readIdentifierWords(selectedPropertyName);

  return (
    selectedPropertyWords.length > 0 &&
    functionNameWords.length >= selectedPropertyWords.length &&
    selectedPropertyWords.every(
      (propertyWord, index) =>
        functionNameWords[functionNameWords.length - selectedPropertyWords.length + index] === propertyWord,
    )
  );
}

function isDirectForwardedArgument(node: ForwardingArgumentNode, parameterNameSet: ReadonlySet<string>): boolean {
  if (node.type === "Identifier") {
    return parameterNameSet.has(node.name);
  }

  if (node.type === "SpreadElement" && node.argument.type === "Identifier") {
    return parameterNameSet.has(node.argument.name);
  }

  return false;
}

function readForwardedArgumentName(node: ForwardingArgumentNode): string {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "SpreadElement" && node.argument.type === "Identifier") {
    return node.argument.name;
  }

  throw new Error("Expected a direct forwarded argument.");
}

function readForwardedArgumentNames(arguments_: readonly ForwardingArgumentNode[]): string[] {
  return arguments_.map((argumentNode) => readForwardedArgumentName(argumentNode));
}

function isIdentityForwardingOrder(
  forwardedParameterNames: readonly string[],
  declaredParameterNames: readonly string[],
): boolean {
  return (
    forwardedParameterNames.length === declaredParameterNames.length &&
    forwardedParameterNames.every((parameterName, index) => parameterName === declaredParameterNames[index])
  );
}

function analyzeForwardingExpression(
  node: PropertyKeyNode,
  parameterNameSet: ReadonlySet<string>,
  declaredParameterNames: readonly string[],
): ForwardingAnalysis {
  if (node.type === "Identifier") {
    return {
      forwardedParameterNames: parameterNameSet.has(node.name) ? [node.name] : [],
      hasExternalTarget: !parameterNameSet.has(node.name),
      isForwarding: true,
    };
  }

  if (node.type === "ChainExpression") {
    return analyzeForwardingExpression(node.expression, parameterNameSet, declaredParameterNames);
  }

  if (node.type === "MemberExpression") {
    const objectAnalysis = analyzeForwardingExpression(node.object, parameterNameSet, declaredParameterNames);
    if (!objectAnalysis.isForwarding) {
      return objectAnalysis;
    }

    if (node.computed && !isLiteralPropertyKey(node.property)) {
      return {
        forwardedParameterNames: objectAnalysis.forwardedParameterNames,
        hasExternalTarget: objectAnalysis.hasExternalTarget,
        isForwarding: false,
      };
    }

    return objectAnalysis;
  }

  if (node.type === "CallExpression") {
    const calleeAnalysis = analyzeForwardingExpression(node.callee, parameterNameSet, declaredParameterNames);
    if (!calleeAnalysis.isForwarding) {
      return calleeAnalysis;
    }

    if (!node.arguments.every((argumentNode) => isDirectForwardedArgument(argumentNode, parameterNameSet))) {
      return {
        forwardedParameterNames: calleeAnalysis.forwardedParameterNames,
        hasExternalTarget: calleeAnalysis.hasExternalTarget,
        isForwarding: false,
      };
    }

    const forwardedArgumentNames = readForwardedArgumentNames(node.arguments);
    const forwardedParameterNames = [...calleeAnalysis.forwardedParameterNames, ...forwardedArgumentNames];

    if (!isIdentityForwardingOrder(forwardedParameterNames, declaredParameterNames)) {
      return {
        forwardedParameterNames,
        hasExternalTarget: calleeAnalysis.hasExternalTarget,
        isForwarding: false,
      };
    }

    return {
      forwardedParameterNames,
      hasExternalTarget: calleeAnalysis.hasExternalTarget,
      isForwarding: true,
    };
  }

  return {
    forwardedParameterNames: [],
    hasExternalTarget: false,
    isForwarding: false,
  };
}

function reportIfTrivialForwardingFunction(context: RuleContext, node: SupportedFunctionNode): void {
  if (node.async || node.generator || !isSupportedFunctionNode(node)) {
    return;
  }

  const declaredParameterNames = readForwardedParameterNames(node);
  if (declaredParameterNames === null) {
    return;
  }

  const functionName = readFunctionName(node);
  if (functionName === null) {
    return;
  }

  const parameterNameSet = new Set(declaredParameterNames);

  const returnedExpression = readReturnedExpression(node);
  if (returnedExpression === null) {
    return;
  }

  const unwrappedReturnedExpression = unwrapChainExpression(returnedExpression);
  if (unwrappedReturnedExpression.type !== "MemberExpression") {
    return;
  }

  if (unwrappedReturnedExpression.computed && !isLiteralPropertyKey(unwrappedReturnedExpression.property)) {
    return;
  }

  const selectedPropertyName = readSelectedPropertyName(unwrappedReturnedExpression);
  if (selectedPropertyName === null || !doesFunctionNameRestateSelectedProperty(functionName, selectedPropertyName)) {
    return;
  }

  const expressionAnalysis = analyzeForwardingExpression(
    unwrappedReturnedExpression.object,
    parameterNameSet,
    declaredParameterNames,
  );
  if (!expressionAnalysis.isForwarding || !expressionAnalysis.hasExternalTarget) {
    return;
  }

  context.report({
    node: readReportNode(node),
    messageId: "unexpectedTrivialForwardingFunction",
  });
}

const noTrivialForwardingFunctionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow trivial selector wrappers that only return a forwarded property read",
      guidance:
        "Do not keep functions whose whole body only returns a forwarded property read when the function name merely restates that property. Inline the property access at the call site or move real ownership logic into the function.",
    },
    schema: [],
    messages: {
      unexpectedTrivialForwardingFunction:
        "Delete this trivial forwarding function. Inline the forwarded property access at the call site or move real ownership logic into this function.",
    },
  },
  create(context) {
    return {
      ArrowFunctionExpression(node) {
        reportIfTrivialForwardingFunction(context, node);
      },
      FunctionDeclaration(node) {
        reportIfTrivialForwardingFunction(context, node);
      },
      FunctionExpression(node) {
        reportIfTrivialForwardingFunction(context, node);
      },
    };
  },
};

export default noTrivialForwardingFunctionRule;
