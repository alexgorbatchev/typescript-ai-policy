import {
  readDefaultExportDeclaration,
  readTopLevelVariableDeclarator,
} from "./componentOwnership/storyMetaBindings.ts";
import type { TSESTree } from "@typescript-eslint/types";
import type { RuleModule } from "./types.ts";
import { readProgramReportNode, unwrapExpression } from "./helpers.ts";

function isMetaTypeReference(typeAnnotation: TSESTree.TypeNode | null | undefined): boolean {
  if (typeAnnotation?.type !== "TSTypeReference") {
    return false;
  }

  if (typeAnnotation.typeName.type !== "Identifier" || typeAnnotation.typeName.name !== "Meta") {
    return false;
  }

  const metaTypeArguments = typeAnnotation.typeArguments?.params ?? [];
  if (metaTypeArguments.length !== 1) {
    return false;
  }

  return metaTypeArguments[0]?.type === "TSTypeQuery";
}

function readMetaAssertionTypeAnnotation(expression: TSESTree.Expression): TSESTree.TypeNode | null {
  const unwrappedExpression = unwrapExpression(expression);
  if (unwrappedExpression.type !== "TSAsExpression" && unwrappedExpression.type !== "TSSatisfiesExpression") {
    return null;
  }

  return unwrappedExpression.typeAnnotation;
}

const storyMetaTypeAnnotationRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require Storybook files to default-export a top-level const meta binding typed as "Meta<typeof ComponentName>" and ban meta object assertions',
      guidance:
        "Bind Storybook meta to a typed top-level const and default-export that identifier. Do not type story meta with object assertions.",
    },
    schema: [],
    messages: {
      invalidMetaBinding:
        "Bind Storybook meta to a top-level const and default-export that identifier. Use a typed meta binding instead of exporting the object inline.",
      missingMetaTypeAnnotation:
        "Annotate the meta binding as `Meta<typeof Component>`. Do not rely on inference for story meta.",
      unexpectedMetaTypeAssertion:
        "Replace this meta assertion with a const type annotation. Keep story meta typed on the binding, not on the object expression.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const defaultExportDeclaration = readDefaultExportDeclaration(node);
        if (!defaultExportDeclaration || defaultExportDeclaration.declaration.type !== "Identifier") {
          context.report({
            node: defaultExportDeclaration ?? readProgramReportNode(node),
            messageId: "invalidMetaBinding",
          });
          return;
        }

        const metaBinding = readTopLevelVariableDeclarator(node, defaultExportDeclaration.declaration.name);
        if (!metaBinding || metaBinding.declaration.kind !== "const" || !metaBinding.declarator.init) {
          context.report({
            node: defaultExportDeclaration,
            messageId: "invalidMetaBinding",
          });
          return;
        }

        const metaInitializer = unwrapExpression(metaBinding.declarator.init);
        if (
          metaInitializer.type !== "ObjectExpression" &&
          metaInitializer.type !== "TSAsExpression" &&
          metaInitializer.type !== "TSSatisfiesExpression"
        ) {
          context.report({
            node: metaBinding.declarator,
            messageId: "invalidMetaBinding",
          });
          return;
        }

        const metaAssertionTypeAnnotation = readMetaAssertionTypeAnnotation(metaBinding.declarator.init);
        if (metaAssertionTypeAnnotation && isMetaTypeReference(metaAssertionTypeAnnotation)) {
          context.report({
            node: metaBinding.declarator.init,
            messageId: "unexpectedMetaTypeAssertion",
          });
        }

        if (!isMetaTypeReference(metaBinding.declarator.id.typeAnnotation?.typeAnnotation)) {
          context.report({
            node: metaBinding.declarator.id,
            messageId: "missingMetaTypeAnnotation",
          });
        }
      },
    };
  },
};

export default storyMetaTypeAnnotationRule;
