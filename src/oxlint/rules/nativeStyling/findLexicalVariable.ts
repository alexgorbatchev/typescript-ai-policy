import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import type { RuleContext } from "../types.ts";

export function findLexicalVariable(
  context: RuleContext,
  node: TSESTree.Node,
  name: string,
): TSESLint.Scope.Variable | null {
  let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return null;
}
