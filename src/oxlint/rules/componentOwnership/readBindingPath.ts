import type { Expression, TSTypeQueryExprName } from "oxc-parser";

type BindingReference = Expression | TSTypeQueryExprName;

export function readBindingPath(node: BindingReference): string[] | null {
  if (node.type === "Identifier") return [node.name];
  if (node.type === "TSQualifiedName") {
    const parent = readBindingPath(node.left);
    return parent ? [...parent, node.right.name] : null;
  }
  if (node.type === "MemberExpression" && !node.optional) {
    const parent = readBindingPath(node.object);
    const name =
      !node.computed && node.property.type === "Identifier"
        ? node.property.name
        : node.computed && node.property.type === "Literal" && typeof node.property.value === "string"
          ? node.property.value
          : null;
    return parent && name !== null ? [...parent, name] : null;
  }
  return null;
}
