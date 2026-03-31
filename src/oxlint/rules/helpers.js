export function getComponentNameFromAncestors(node) {
  let current = node;
  let componentName = null;

  while (current) {
    if (current.type === "FunctionDeclaration" && current.id) {
      componentName = current.id.name;
    }

    if (current.type === "VariableDeclarator" && current.id?.type === "Identifier") {
      componentName = current.id.name;
    }

    current = current.parent;
  }

  return componentName;
}

export function getFilenameWithoutExtension(filename) {
  const baseName = filename.split("/").pop() ?? "";
  const extensionIndex = baseName.lastIndexOf(".");

  return extensionIndex === -1 ? baseName : baseName.slice(0, extensionIndex);
}

export function unwrapExpression(expression) {
  let currentExpression = expression;

  while (currentExpression.type === "ParenthesizedExpression") {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

export function isTestIdAttributeName(attributeName) {
  return attributeName === "data-testid" || attributeName === "testId";
}

export function readJsxAttributeName(attributeName) {
  if (attributeName.type === "JSXIdentifier") {
    return attributeName.name;
  }

  if (attributeName.type === "JSXNamespacedName") {
    return `${attributeName.namespace.name}:${attributeName.name.name}`;
  }

  return "";
}

export function isAstNode(value) {
  return value !== null && typeof value === "object" && typeof value.type === "string";
}

export function readChildNodes(node) {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === "parent" || key === "loc" || key === "range") {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter(isAstNode);
    }

    return isAstNode(value) ? [value] : [];
  });
}

export function isNestedFunctionNode(node) {
  return (
    node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression"
  );
}

export function isNestedClassNode(node) {
  return node.type === "ClassDeclaration" || node.type === "ClassExpression";
}

export function isNullLiteral(node) {
  return node.type === "Literal" && node.value === null;
}

export function isPascalCase(value) {
  return /^[A-Z][A-Za-z0-9]*$/u.test(value);
}
