const NON_OWNERSHIP_SUPPORT_BASENAMES = new Set(["index", "types", "constants", "helpers"]);
const STRICT_AREA_ALLOWED_SUPPORT_FILES = new Set(["index.ts", "types.ts"]);

export function normalizeFilename(filename) {
  return filename.replaceAll("\\", "/");
}

export function getPathSegments(filename) {
  return normalizeFilename(filename).split("/").filter(Boolean);
}

export function getBaseName(filename) {
  const normalizedFilename = normalizeFilename(filename);

  return normalizedFilename.split("/").pop() ?? "";
}

export function getFilenameWithoutExtension(filename) {
  const baseName = getBaseName(filename);
  const extensionIndex = baseName.lastIndexOf(".");

  return extensionIndex === -1 ? baseName : baseName.slice(0, extensionIndex);
}

export function getExtension(filename) {
  const baseName = getBaseName(filename);
  const extensionIndex = baseName.lastIndexOf(".");

  return extensionIndex === -1 ? "" : baseName.slice(extensionIndex);
}

export function hasBaseName(path, expectedBaseName) {
  const baseName = getBaseName(path);

  return (
    baseName === expectedBaseName ||
    getFilenameWithoutExtension(baseName) === expectedBaseName ||
    baseName === `${expectedBaseName}.d.ts` ||
    baseName === `${expectedBaseName}.d.tsx` ||
    baseName === `${expectedBaseName}.d.mts` ||
    baseName === `${expectedBaseName}.d.cts`
  );
}

export function hasPathSegment(filename, expectedSegment) {
  return getPathSegments(filename).includes(expectedSegment);
}

export function readPathFromDirectory(filename, expectedDirectoryName) {
  const pathSegments = getPathSegments(filename);
  const directoryIndex = pathSegments.indexOf(expectedDirectoryName);
  if (directoryIndex === -1) {
    return null;
  }

  return pathSegments.slice(directoryIndex + 1).join("/");
}

export function readPathFromFirstMatchingDirectory(filename, expectedDirectoryNames) {
  const expectedDirectoryNameSet =
    expectedDirectoryNames instanceof Set ? expectedDirectoryNames : new Set(expectedDirectoryNames);
  const pathSegments = getPathSegments(filename);

  for (let directoryIndex = 0; directoryIndex < pathSegments.length; directoryIndex += 1) {
    const pathSegment = pathSegments[directoryIndex];
    if (!expectedDirectoryNameSet.has(pathSegment)) {
      continue;
    }

    return {
      directoryName: pathSegment,
      relativePath: pathSegments.slice(directoryIndex + 1).join("/"),
    };
  }

  return null;
}

export function isDirectChildOfDirectory(filename, expectedDirectoryName) {
  const relativePath = readPathFromDirectory(filename, expectedDirectoryName);

  return relativePath !== null && relativePath !== "" && !relativePath.includes("/");
}

export function isDirectChildOfAnyDirectory(filename, expectedDirectoryNames) {
  const expectedDirectoryNameSet =
    expectedDirectoryNames instanceof Set ? expectedDirectoryNames : new Set(expectedDirectoryNames);
  const pathSegments = getPathSegments(filename);
  if (pathSegments.length < 2) {
    return false;
  }

  return expectedDirectoryNameSet.has(pathSegments[pathSegments.length - 2]);
}

export function isExemptSupportBasename(filename) {
  return NON_OWNERSHIP_SUPPORT_BASENAMES.has(getFilenameWithoutExtension(filename));
}

export function isStrictAreaAllowedSupportFile(filename) {
  return STRICT_AREA_ALLOWED_SUPPORT_FILES.has(getBaseName(filename));
}

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

export function isTestsDirectoryPath(path) {
  const normalizedPath = normalizeFilename(path);

  return /(^|\/)__tests__(\/|$)/u.test(normalizedPath);
}

export function isInTestsDirectory(filename) {
  return isTestsDirectoryPath(filename);
}

export function readPathFromTestsDirectory(filename) {
  const normalizedFilename = normalizeFilename(filename);

  if (normalizedFilename.startsWith("__tests__/")) {
    return normalizedFilename.slice("__tests__/".length);
  }

  const testsDirectoryMarker = "/__tests__/";
  const testsDirectoryIndex = normalizedFilename.indexOf(testsDirectoryMarker);
  if (testsDirectoryIndex === -1) {
    return null;
  }

  return normalizedFilename.slice(testsDirectoryIndex + testsDirectoryMarker.length);
}

export function isStoriesDirectoryPath(path) {
  const normalizedPath = normalizeFilename(path);

  return /(^|\/)stories(\/|$)/u.test(normalizedPath);
}

export function isInStoriesDirectory(filename) {
  return isStoriesDirectoryPath(filename);
}

export function readPathFromStoriesDirectory(filename) {
  const normalizedFilename = normalizeFilename(filename);

  if (normalizedFilename.startsWith("stories/")) {
    return normalizedFilename.slice("stories/".length);
  }

  const storiesDirectoryMarker = "/stories/";
  const storiesDirectoryIndex = normalizedFilename.indexOf(storiesDirectoryMarker);
  if (storiesDirectoryIndex === -1) {
    return null;
  }

  return normalizedFilename.slice(storiesDirectoryIndex + storiesDirectoryMarker.length);
}

export function isStoryFile(filename) {
  const relativePath = readPathFromStoriesDirectory(filename);

  return relativePath !== null && /^[^/]+\.stories\.tsx$/u.test(relativePath);
}

export function getStorySourceBaseName(filename) {
  const fileStem = getFilenameWithoutExtension(filename);

  return fileStem.endsWith(".stories") ? fileStem.slice(0, -".stories".length) : null;
}

export function readPathFromFixtureSupportDirectory(filename) {
  const testsRelativePath = readPathFromTestsDirectory(filename);
  if (testsRelativePath !== null) {
    return testsRelativePath;
  }

  return readPathFromStoriesDirectory(filename);
}

export function isFixturesFile(filename) {
  const relativePath = readPathFromFixtureSupportDirectory(filename);

  return relativePath === "fixtures.ts" || relativePath === "fixtures.tsx";
}

export function isInFixturesArea(filename) {
  const relativePath = readPathFromFixtureSupportDirectory(filename);

  return (
    relativePath === "fixtures.ts" || relativePath === "fixtures.tsx" || relativePath?.startsWith("fixtures/") === true
  );
}

export function isTestFile(filename) {
  const relativePath = readPathFromTestsDirectory(filename);

  return relativePath !== null && /^[^/]+\.test\.tsx?$/u.test(relativePath);
}

export function isFixtureConsumerFile(filename) {
  return isTestFile(filename) || isStoryFile(filename);
}

export function isFixtureConstName(name) {
  return /^fixture_[a-z][A-Za-z0-9]*$/u.test(name);
}

export function isFactoryFunctionName(name) {
  return /^factory_[a-z][A-Za-z0-9]*$/u.test(name);
}

export function isFixtureLikeName(name) {
  return name.startsWith("fixture_") || name.startsWith("factory_");
}

export function isAllowedFixturesImportPath(importPath) {
  return importPath === "./fixtures";
}

export function readPatternIdentifierNames(pattern) {
  if (pattern.type === "Identifier") {
    return [pattern.name];
  }

  if (pattern.type === "RestElement") {
    return readPatternIdentifierNames(pattern.argument);
  }

  if (pattern.type === "ArrayPattern") {
    return pattern.elements.flatMap((element) => {
      if (!element) {
        return [];
      }

      return readPatternIdentifierNames(element);
    });
  }

  if (pattern.type === "ObjectPattern") {
    return pattern.properties.flatMap((property) => {
      if (property.type === "RestElement") {
        return readPatternIdentifierNames(property.argument);
      }

      return readPatternIdentifierNames(property.value);
    });
  }

  if (pattern.type === "AssignmentPattern") {
    return readPatternIdentifierNames(pattern.left);
  }

  return [];
}

export function readDeclarationIdentifierNames(declaration) {
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) => readPatternIdentifierNames(declarator.id));
  }

  if (
    (declaration.type === "FunctionDeclaration" ||
      declaration.type === "ClassDeclaration" ||
      declaration.type === "TSTypeAliasDeclaration" ||
      declaration.type === "TSInterfaceDeclaration" ||
      declaration.type === "TSEnumDeclaration") &&
    declaration.id
  ) {
    return [declaration.id.name];
  }

  return [];
}

export function readLiteralStringValue(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  return null;
}

export function isTypeDeclaration(node) {
  return node?.type === "TSTypeAliasDeclaration" || node?.type === "TSInterfaceDeclaration";
}

export function unwrapExpression(expression) {
  let currentExpression = expression;

  while (currentExpression.type === "ParenthesizedExpression") {
    currentExpression = currentExpression.expression;
  }

  return currentExpression;
}

export function unwrapTypeScriptExpression(expression) {
  let currentExpression = unwrapExpression(expression);

  while (
    currentExpression.type === "TSAsExpression" ||
    currentExpression.type === "TSSatisfiesExpression" ||
    currentExpression.type === "TSNonNullExpression"
  ) {
    currentExpression = unwrapExpression(currentExpression.expression);
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
