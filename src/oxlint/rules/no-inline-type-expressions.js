import { isTypeDeclaration } from "./helpers.js";

const INLINE_TYPE_LABEL_BY_NODE_TYPE = {
  TSConditionalType: "conditional type expression",
  TSConstructorType: "constructor-signature type expression",
  TSFunctionType: "function-signature type expression",
  TSIntersectionType: "intersection type expression",
  TSMappedType: "mapped type expression",
  TSTupleType: "tuple type expression",
  TSTypeLiteral: "object-literal type expression",
  TSUnionType: "union type expression",
};

function isInlineTypeExpressionNode(node) {
  return node !== null && typeof node === "object" && Object.hasOwn(INLINE_TYPE_LABEL_BY_NODE_TYPE, node.type);
}

function isInsideAllowedTypeDeclaration(node) {
  let current = node.parent;

  while (current) {
    if (isTypeDeclaration(current)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function hasInlineTypeExpressionAncestor(node) {
  let current = node.parent;

  while (current) {
    if (isTypeDeclaration(current)) {
      return false;
    }

    if (isInlineTypeExpressionNode(current)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function reportUnexpectedInlineTypeExpression(context, node) {
  if (isInsideAllowedTypeDeclaration(node) || hasInlineTypeExpressionAncestor(node)) {
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

const noInlineTypeExpressionsRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        "Disallow inline type expressions outside type declarations; require named type declarations or inference instead",
    },
    schema: [],
    messages: {
      unexpectedInlineTypeExpression:
        "Do not define an inline {{ kind }} here. Extract this contract into a named type declaration and reference that declaration instead, or remove the annotation and let TypeScript infer the type.",
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
