import type { TSESTree } from "@typescript-eslint/utils";
import { isIntrinsicElementName } from "../helpers.ts";
import type { RuleContext } from "../types.ts";
import { createNativeImportMatcher } from "./createNativeImportMatcher.ts";
import { findLexicalVariable } from "./findLexicalVariable.ts";

type NativeRenderMatcher = (opening: TSESTree.JSXOpeningElement) => boolean;

export function createNativeRenderMatcher(context: RuleContext): NativeRenderMatcher {
  const isNativeImport = createNativeImportMatcher(context);

  function isNativeExpression(expression: TSESTree.Node, visited: Set<TSESTree.Node>): boolean {
    if (visited.has(expression)) return false;
    visited.add(expression);
    if (expression.type === "JSXElement") return isNativeOpening(expression.openingElement, visited);
    if (
      expression.type === "TSAsExpression" ||
      expression.type === "TSSatisfiesExpression" ||
      expression.type === "TSNonNullExpression"
    ) {
      return isNativeExpression(expression.expression, visited);
    }
    if (expression.type !== "Identifier") return false;
    const variable = findLexicalVariable(context, expression, expression.name);
    if (!variable || variable.defs.length !== 1) return false;
    const definition = variable.defs[0];
    if (
      !definition ||
      definition.type !== "Variable" ||
      definition.parent.kind !== "const" ||
      definition.node.id.type !== "Identifier" ||
      !definition.node.init
    )
      return false;
    return isNativeExpression(definition.node.init, visited);
  }

  function isNativeOpening(opening: TSESTree.JSXOpeningElement, visited: Set<TSESTree.Node>): boolean {
    if (isIntrinsicElementName(opening.name)) return true;
    if (!isNativeImport(opening.name)) return false;
    for (let index = opening.attributes.length - 1; index >= 0; index -= 1) {
      const attribute = opening.attributes[index];
      if (attribute?.type === "JSXSpreadAttribute") return false;
      if (
        attribute?.type !== "JSXAttribute" ||
        attribute.name.type !== "JSXIdentifier" ||
        attribute.name.name !== "render"
      )
        continue;
      return (
        attribute.value?.type === "JSXExpressionContainer" && isNativeExpression(attribute.value.expression, visited)
      );
    }
    return true;
  }

  return (opening) => isNativeOpening(opening, new Set());
}
