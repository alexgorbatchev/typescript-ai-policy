import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, RuleModule } from "./types.ts";
import { readProgramReportNode, unwrapExpression } from "./helpers.ts";

type MetaBinding = {
  declaration: TSESTree.VariableDeclaration;
  declarator: TSESTree.VariableDeclarator;
};

function readDefaultExportDeclaration(program: AstProgram): TSESTree.ExportDefaultDeclaration | null {
  return program.body.find((statement) => statement.type === "ExportDefaultDeclaration") ?? null;
}

function readTopLevelVariableDeclarator(program: AstProgram, name: string): MetaBinding | null {
  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration") {
      continue;
    }

    for (const declarator of statement.declarations) {
      if (declarator.id.type === "Identifier" && declarator.id.name === name) {
        return {
          declaration: statement,
          declarator,
        };
      }
    }
  }

  return null;
}

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
    },
    schema: [],
    messages: {
      invalidMetaBinding:
        "Bind the default Storybook meta as a top-level const object and export that identifier: `const meta: Meta<typeof ComponentName> = { ... }; export default meta;`.",
      missingMetaTypeAnnotation:
        "Annotate the meta binding as `Meta<typeof ComponentName>`. Storybook meta objects must use a type annotation on the const binding instead of inference.",
      unexpectedMetaTypeAssertion:
        "Replace this meta object assertion with a const type annotation: `const meta: Meta<typeof ComponentName> = { ... };`.",
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
