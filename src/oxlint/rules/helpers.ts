import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { NodeWithParent, TSESTree } from "@typescript-eslint/types";
import type {
  AstClassLike,
  AstDeclarationWithIdentifiers,
  AstDestructuringPattern,
  AstFunctionLike,
  AstNode,
  AstTypeDeclaration,
} from "./types.ts";

const NON_OWNERSHIP_SUPPORT_BASENAMES = new Set(["index", "types", "constants", "helpers"]);
const STRICT_AREA_ALLOWED_SUPPORT_FILES = new Set(["index.ts", "types.ts"]);

type DirectoryNames = ReadonlySet<string> | readonly string[];
type FirstMatchingDirectoryResult = {
  directoryName: string;
  relativePath: string;
};

export function normalizeFilename(filename: string): string {
  return filename.replaceAll("\\", "/");
}

export function getPathSegments(filename: string): string[] {
  return normalizeFilename(filename).split("/").filter(Boolean);
}

export function getBaseName(filename: string): string {
  const normalizedFilename = normalizeFilename(filename);

  return normalizedFilename.split("/").pop() ?? "";
}

export function getFilenameWithoutExtension(filename: string): string {
  const baseName = getBaseName(filename);
  const extensionIndex = baseName.lastIndexOf(".");

  return extensionIndex === -1 ? baseName : baseName.slice(0, extensionIndex);
}

export function getExtension(filename: string): string {
  const baseName = getBaseName(filename);
  const extensionIndex = baseName.lastIndexOf(".");

  return extensionIndex === -1 ? "" : baseName.slice(extensionIndex);
}

export function hasBaseName(path: string, expectedBaseName: string): boolean {
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

export function hasPathSegment(filename: string, expectedSegment: string): boolean {
  return getPathSegments(filename).includes(expectedSegment);
}

export function readPathFromDirectory(filename: string, expectedDirectoryName: string): string | null {
  const pathSegments = getPathSegments(filename);
  const directoryIndex = pathSegments.indexOf(expectedDirectoryName);
  if (directoryIndex === -1) {
    return null;
  }

  return pathSegments.slice(directoryIndex + 1).join("/");
}

export function readPathFromFirstMatchingDirectory(
  filename: string,
  expectedDirectoryNames: DirectoryNames,
): FirstMatchingDirectoryResult | null {
  const expectedDirectoryNameSet =
    expectedDirectoryNames instanceof Set ? expectedDirectoryNames : new Set(expectedDirectoryNames);
  const pathSegments = getPathSegments(filename);

  for (let directoryIndex = 0; directoryIndex < pathSegments.length; directoryIndex += 1) {
    const pathSegment = pathSegments[directoryIndex];
    if (pathSegment === undefined || !expectedDirectoryNameSet.has(pathSegment)) {
      continue;
    }

    return {
      directoryName: pathSegment,
      relativePath: pathSegments.slice(directoryIndex + 1).join("/"),
    };
  }

  return null;
}

export function isDirectChildOfDirectory(filename: string, expectedDirectoryName: string): boolean {
  const relativePath = readPathFromDirectory(filename, expectedDirectoryName);

  return relativePath !== null && relativePath !== "" && !relativePath.includes("/");
}

export function isDirectChildOfAnyDirectory(filename: string, expectedDirectoryNames: DirectoryNames): boolean {
  const expectedDirectoryNameSet =
    expectedDirectoryNames instanceof Set ? expectedDirectoryNames : new Set(expectedDirectoryNames);
  const pathSegments = getPathSegments(filename);
  if (pathSegments.length < 2) {
    return false;
  }

  const parentPathSegment = pathSegments[pathSegments.length - 2];
  return parentPathSegment !== undefined && expectedDirectoryNameSet.has(parentPathSegment);
}

export function isExemptSupportBasename(filename: string): boolean {
  return NON_OWNERSHIP_SUPPORT_BASENAMES.has(getFilenameWithoutExtension(filename));
}

export function isStrictAreaAllowedSupportFile(filename: string): boolean {
  return STRICT_AREA_ALLOWED_SUPPORT_FILES.has(getBaseName(filename));
}

export function getComponentNameFromAncestors(node: NodeWithParent): string | null {
  let current: TSESTree.Node | undefined = node;
  let componentName: string | null = null;

  while (current) {
    if (current.type === "FunctionDeclaration" && current.id) {
      componentName = current.id.name;
    }

    if (current.type === "VariableDeclarator" && current.id.type === "Identifier") {
      componentName = current.id.name;
    }

    const parentNode: unknown = Reflect.get(current, "parent");
    current = isAstNode(parentNode) ? parentNode : undefined;
  }

  return componentName;
}

export function isTestsDirectoryPath(path: string): boolean {
  const normalizedPath = normalizeFilename(path);

  return /(^|\/)__tests__(\/|$)/u.test(normalizedPath);
}

export function isInTestsDirectory(filename: string): boolean {
  return isTestsDirectoryPath(filename);
}

export function readPathFromTestsDirectory(filename: string): string | null {
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

export function isStoriesDirectoryPath(path: string): boolean {
  const normalizedPath = normalizeFilename(path);

  return /(^|\/)stories(\/|$)/u.test(normalizedPath);
}

export function isInStoriesDirectory(filename: string): boolean {
  return isStoriesDirectoryPath(filename);
}

export function readPathFromStoriesDirectory(filename: string): string | null {
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

export function readRootPathBeforeDirectory(filename: string, expectedDirectoryName: string): string | null {
  const normalizedFilename = normalizeFilename(filename);
  const directoryPrefix = `${expectedDirectoryName}/`;
  const rootedDirectoryPrefix = `/${expectedDirectoryName}/`;

  if (normalizedFilename.startsWith(directoryPrefix)) {
    return "";
  }

  if (normalizedFilename.startsWith(rootedDirectoryPrefix)) {
    return "/";
  }

  const directoryMarker = `/${expectedDirectoryName}/`;
  const directoryIndex = normalizedFilename.indexOf(directoryMarker);
  if (directoryIndex === -1) {
    return null;
  }

  return normalizedFilename.slice(0, directoryIndex);
}

export function findDescendantFilePath(rootDirectoryPath: string, expectedBaseName: string): string | null {
  if (!existsSync(rootDirectoryPath) || !statSync(rootDirectoryPath).isDirectory()) {
    return null;
  }

  const directoryEntries = readdirSync(rootDirectoryPath, { withFileTypes: true });

  for (const directoryEntry of directoryEntries) {
    const entryPath = `${normalizeFilename(rootDirectoryPath)}/${directoryEntry.name}`;

    if (directoryEntry.isDirectory()) {
      const descendantFilePath = findDescendantFilePath(entryPath, expectedBaseName);
      if (descendantFilePath) {
        return descendantFilePath;
      }

      continue;
    }

    if (directoryEntry.isFile() && directoryEntry.name === expectedBaseName) {
      return entryPath;
    }
  }

  return null;
}

export function isStoryFile(filename: string): boolean {
  const relativePath = readPathFromStoriesDirectory(filename);

  return relativePath !== null && /(^|\/)[^/]+\.stories\.tsx$/u.test(relativePath);
}

export function getStorySourceBaseName(filename: string): string | null {
  const fileStem = getFilenameWithoutExtension(filename);

  return fileStem.endsWith(".stories") ? fileStem.slice(0, -".stories".length) : null;
}

export function readPathFromFixtureSupportDirectory(filename: string): string | null {
  const testsRelativePath = readPathFromTestsDirectory(filename);
  if (testsRelativePath !== null) {
    return testsRelativePath;
  }

  return readPathFromStoriesDirectory(filename);
}

export function isFixturesFile(filename: string): boolean {
  const relativePath = readPathFromFixtureSupportDirectory(filename);

  return relativePath !== null && /(^|\/)fixtures\.tsx?$/u.test(relativePath);
}

export function isInFixturesArea(filename: string): boolean {
  const relativePath = readPathFromFixtureSupportDirectory(filename);

  return relativePath !== null && /(^|\/)fixtures(?:\/|\.tsx?$)/u.test(relativePath);
}

export function isTestFile(filename: string): boolean {
  const relativePath = readPathFromTestsDirectory(filename);

  return relativePath !== null && /(^|\/)[^/]+\.test\.tsx?$/u.test(relativePath);
}

export function isFixtureConsumerFile(filename: string): boolean {
  return isTestFile(filename) || isStoryFile(filename);
}

export function isFixtureConstName(name: string): boolean {
  return /^fixture_[a-z][A-Za-z0-9]*$/u.test(name);
}

export function isFactoryFunctionName(name: string): boolean {
  return /^factory_[a-z][A-Za-z0-9]*$/u.test(name);
}

export function isFixtureLikeName(name: string): boolean {
  return name.startsWith("fixture_") || name.startsWith("factory_");
}

type FixtureSupportRoot = {
  directoryName: "__tests__" | "stories";
  rootPath: string;
};

function readFixtureSupportRoot(filename: string): FixtureSupportRoot | null {
  const testsRelativePath = readPathFromTestsDirectory(filename);
  if (testsRelativePath !== null) {
    return {
      directoryName: "__tests__",
      rootPath: readRootPathBeforeDirectory(filename, "__tests__") ?? "",
    };
  }

  const storiesRelativePath = readPathFromStoriesDirectory(filename);
  if (storiesRelativePath !== null) {
    return {
      directoryName: "stories",
      rootPath: readRootPathBeforeDirectory(filename, "stories") ?? "",
    };
  }

  return null;
}

export function isAllowedFixturesImportPath(importPath: string, consumerFilename: string): boolean {
  if (!/^\.\.?(?:\/|$)/u.test(importPath)) {
    return false;
  }

  const resolvedConsumerFilename = normalizeFilename(resolve(consumerFilename));
  const resolvedImportPath = normalizeFilename(resolve(dirname(resolvedConsumerFilename), importPath));
  if (getBaseName(resolvedImportPath) !== "fixtures") {
    return false;
  }

  const consumerFixtureSupportRoot = readFixtureSupportRoot(resolvedConsumerFilename);
  const importedFixtureSupportRoot = readFixtureSupportRoot(resolvedImportPath);
  if (!consumerFixtureSupportRoot || !importedFixtureSupportRoot) {
    return false;
  }

  return (
    consumerFixtureSupportRoot.directoryName === importedFixtureSupportRoot.directoryName &&
    consumerFixtureSupportRoot.rootPath === importedFixtureSupportRoot.rootPath
  );
}

export function readPatternIdentifierNames(pattern: AstDestructuringPattern): string[] {
  if (pattern.type === "Identifier") {
    return [pattern.name];
  }

  if (pattern.type === "RestElement") {
    return readPatternIdentifierNames(pattern.argument);
  }

  if (pattern.type === "MemberExpression") {
    return [];
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

      if (property.value.type === "AssignmentPattern") {
        return readPatternIdentifierNames(property.value.left);
      }

      return isDestructuringPatternNode(property.value) ? readPatternIdentifierNames(property.value) : [];
    });
  }

  if (pattern.type === "AssignmentPattern") {
    return readPatternIdentifierNames(pattern.left);
  }

  return [];
}

export function readDeclarationIdentifierNames(declaration: AstDeclarationWithIdentifiers): string[] {
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) => readPatternIdentifierNames(declarator.id));
  }

  if (
    (declaration.type === "TSModuleDeclaration" || declaration.type === "TSImportEqualsDeclaration") &&
    declaration.id.type === "Identifier"
  ) {
    return [declaration.id.name];
  }

  if (!declaration.id || !("name" in declaration.id)) {
    return [];
  }

  return [declaration.id.name];
}

export function readLiteralStringValue(node: TSESTree.Literal | null | undefined): string | null {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  return null;
}

function isDestructuringPatternNode(node: TSESTree.Node): node is AstDestructuringPattern {
  return (
    node.type === "ArrayPattern" ||
    node.type === "AssignmentPattern" ||
    node.type === "Identifier" ||
    node.type === "MemberExpression" ||
    node.type === "ObjectPattern" ||
    node.type === "RestElement"
  );
}

export function isTypeDeclaration(node: AstNode | null | undefined): node is AstTypeDeclaration {
  return node?.type === "TSTypeAliasDeclaration" || node?.type === "TSInterfaceDeclaration";
}

export function unwrapExpression(expression: TSESTree.Expression): TSESTree.Expression {
  return expression;
}

export function unwrapTypeScriptExpression(expression: TSESTree.Expression): TSESTree.Expression {
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

export function isTestIdAttributeName(attributeName: string): boolean {
  return attributeName === "data-testid" || attributeName === "testId";
}

export function readJsxAttributeName(attributeName: TSESTree.JSXAttribute["name"]): string {
  if (attributeName.type === "JSXIdentifier") {
    return attributeName.name;
  }

  if (attributeName.type === "JSXNamespacedName") {
    return `${attributeName.namespace.name}:${attributeName.name.name}`;
  }

  return "";
}

export function isAstNode(value: unknown): value is AstNode {
  return (
    value !== null && typeof value === "object" && "type" in value && typeof Reflect.get(value, "type") === "string"
  );
}

export function readChildNodes(node: AstNode): AstNode[] {
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

export function isNestedFunctionNode(node: AstNode): node is AstFunctionLike {
  return (
    node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression"
  );
}

export function isNestedClassNode(node: AstNode): node is AstClassLike {
  return node.type === "ClassDeclaration" || node.type === "ClassExpression";
}

export function isNullLiteral(node: TSESTree.Expression): node is TSESTree.Literal {
  return node.type === "Literal" && node.value === null;
}

export function isPascalCase(value: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/u.test(value);
}

function compareNamesByShortestLength(leftName: string, rightName: string): number {
  const lengthDifference = leftName.length - rightName.length;
  if (lengthDifference !== 0) {
    return lengthDifference;
  }

  return leftName.localeCompare(rightName);
}

export function isMultipartComponentPartName(componentName: string, rootComponentName: string): boolean {
  if (componentName === rootComponentName) {
    return true;
  }

  if (!componentName.startsWith(rootComponentName)) {
    return false;
  }

  const componentPartSuffix = componentName.slice(rootComponentName.length);
  return /^[A-Z]/u.test(componentPartSuffix);
}

export function readMultipartComponentRootName(componentNames: readonly string[]): string | null {
  if (componentNames.length < 2) {
    return null;
  }

  const sortedComponentNames = [...componentNames].sort(compareNamesByShortestLength);
  const rootComponentName = sortedComponentNames[0];
  if (!rootComponentName) {
    return null;
  }

  return componentNames.every((componentName) => isMultipartComponentPartName(componentName, rootComponentName))
    ? rootComponentName
    : null;
}
