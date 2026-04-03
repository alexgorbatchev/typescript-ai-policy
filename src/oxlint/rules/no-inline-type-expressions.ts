import type { TSESTree } from "@typescript-eslint/types";
import type { RuleContext, RuleModule } from "./types.ts";
import { isAstNode, isTypeDeclaration } from "./helpers.ts";

type InlineTypeExpressionNode =
  | TSESTree.TSConditionalType
  | TSESTree.TSConstructorType
  | TSESTree.TSFunctionType
  | TSESTree.TSIntersectionType
  | TSESTree.TSMappedType
  | TSESTree.TSTupleType
  | TSESTree.TSTypeLiteral
  | TSESTree.TSUnionType;

const INLINE_TYPE_LABEL_BY_NODE_TYPE: Readonly<Record<InlineTypeExpressionNode["type"], string>> = {
  TSConditionalType: "conditional type expression",
  TSConstructorType: "constructor-signature type expression",
  TSFunctionType: "function-signature type expression",
  TSIntersectionType: "intersection type expression",
  TSMappedType: "mapped type expression",
  TSTupleType: "tuple type expression",
  TSTypeLiteral: "object-literal type expression",
  TSUnionType: "union type expression",
};

function isInlineTypeExpressionNode(node: TSESTree.Node | null | undefined): node is InlineTypeExpressionNode {
  return (
    node?.type === "TSConditionalType" ||
    node?.type === "TSConstructorType" ||
    node?.type === "TSFunctionType" ||
    node?.type === "TSIntersectionType" ||
    node?.type === "TSMappedType" ||
    node?.type === "TSTupleType" ||
    node?.type === "TSTypeLiteral" ||
    node?.type === "TSUnionType"
  );
}

function isNullishTypeNode(node: TSESTree.TypeNode | null | undefined): boolean {
  return node?.type === "TSNullKeyword" || node?.type === "TSUndefinedKeyword";
}

function isAllowedNullableUnionType(node: TSESTree.TypeNode | null | undefined): node is TSESTree.TSUnionType {
  if (node?.type !== "TSUnionType") {
    return false;
  }

  let nonNullishTypeCount = 0;
  let hasNullishType = false;

  for (const memberType of node.types) {
    if (isNullishTypeNode(memberType)) {
      hasNullishType = true;
      continue;
    }

    nonNullishTypeCount += 1;
    if (nonNullishTypeCount > 1) {
      return false;
    }
  }

  return hasNullishType && nonNullishTypeCount === 1;
}

function readParentNode(node: TSESTree.Node): TSESTree.Node | undefined {
  const parentNode: unknown = Reflect.get(node, "parent");
  return isAstNode(parentNode) ? parentNode : undefined;
}

function isInsideAllowedTypeDeclaration(node: TSESTree.Node): boolean {
  let current = readParentNode(node);

  while (current) {
    if (isTypeDeclaration(current)) {
      return true;
    }

    current = readParentNode(current);
  }

  return false;
}

function hasInlineTypeExpressionAncestor(node: TSESTree.Node): boolean {
  let current = readParentNode(node);

  while (current) {
    if (isTypeDeclaration(current)) {
      return false;
    }

    if (isInlineTypeExpressionNode(current)) {
      if (isAllowedNullableUnionType(current)) {
        current = readParentNode(current);
        continue;
      }

      return true;
    }

    current = readParentNode(current);
  }

  return false;
}

function reportUnexpectedInlineTypeExpression(context: RuleContext, node: InlineTypeExpressionNode): void {
  if (
    isInsideAllowedTypeDeclaration(node) ||
    hasInlineTypeExpressionAncestor(node) ||
    isAllowedNullableUnionType(node)
  ) {
    return;
  }

  context.report({
    node,
    messageId: "unexpectedInlineTypeExpression",
    data: {
      kind: INLINE_TYPE_LABEL_BY_NODE_TYPE[node.type],
    },
  });
}

const noInlineTypeExpressionsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow inline type expressions outside type declarations; require named type declarations or inference instead, except for nullable or undefinable wrappers around a single existing type",
    },
    schema: [],
    messages: {
      unexpectedInlineTypeExpression:
        "Do not define an inline {{ kind }} here. First, reuse an existing named type declaration if one already models this contract. If no suitable named type exists, extract this contract into a named type declaration and reference that declaration. Only remove the annotation and let TypeScript infer the type when the type is already obvious from context.",
    },
  },
  create(context) {
    return {
      TSConditionalType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSConstructorType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSFunctionType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSIntersectionType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSMappedType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSTupleType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSTypeLiteral(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
      TSUnionType(node) {
        reportUnexpectedInlineTypeExpression(context, node);
      },
    };
  },
};

export default noInlineTypeExpressionsRule;
