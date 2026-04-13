import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, RuleModule } from "./types.ts";
import { getPathSegments, readPackageRelativePath, unwrapTypeScriptExpression } from "./helpers.ts";

type MetaBinding = {
  declaration: TSESTree.VariableDeclaration;
  declarator: TSESTree.VariableDeclarator;
};

type ObjectExpressionProperty = TSESTree.Property & {
  value: TSESTree.Expression;
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

type MetaInfo = {
  objectExpression: TSESTree.ObjectExpression;
  declaratorId: TSESTree.Identifier;
};

function readMetaInfo(program: AstProgram): MetaInfo | null {
  const defaultExportDeclaration = readDefaultExportDeclaration(program);
  if (!defaultExportDeclaration || defaultExportDeclaration.declaration.type !== "Identifier") {
    return null;
  }

  const metaBinding = readTopLevelVariableDeclarator(program, defaultExportDeclaration.declaration.name);
  if (!metaBinding || metaBinding.declaration.kind !== "const" || !metaBinding.declarator.init) {
    return null;
  }

  const metaInitializer = unwrapTypeScriptExpression(metaBinding.declarator.init);

  if (metaInitializer.type === "ObjectExpression") {
    return {
      objectExpression: metaInitializer,
      declaratorId: metaBinding.declarator.id as TSESTree.Identifier,
    };
  }

  return null;
}

function readPropertyName(property: TSESTree.Property): string | null {
  if (property.computed) {
    return null;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  if (property.key.type === "Literal" && typeof property.key.value === "string") {
    return property.key.value;
  }

  return null;
}

function readTitleProperty(metaObjectExpression: TSESTree.ObjectExpression): ObjectExpressionProperty | null {
  for (const property of metaObjectExpression.properties) {
    if (property.type === "Property" && readPropertyName(property) === "title") {
      return property as ObjectExpressionProperty;
    }
  }

  return null;
}

function readStaticStringValue(expression: TSESTree.Expression): string | null {
  const unwrappedExpression = unwrapTypeScriptExpression(expression);

  if (unwrappedExpression.type === "Literal" && typeof unwrappedExpression.value === "string") {
    return unwrappedExpression.value;
  }

  if (unwrappedExpression.type !== "TemplateLiteral" || unwrappedExpression.expressions.length > 0) {
    return null;
  }

  return unwrappedExpression.quasis[0]?.value.cooked ?? null;
}

function readExpectedStoryTitle(filename: string): string | null {
  const packageRelativePath = readPackageRelativePath(filename);
  if (packageRelativePath === null) {
    return null;
  }

  let pathSegments = getPathSegments(packageRelativePath);
  if (pathSegments[0] === "src") {
    pathSegments = pathSegments.slice(1);
  }

  const storiesDirectoryIndex = pathSegments.indexOf("stories");
  if (storiesDirectoryIndex === -1) {
    return null;
  }

  const storyFilename = pathSegments[pathSegments.length - 1];
  if (!storyFilename?.endsWith(".stories.tsx")) {
    return null;
  }

  const storyTitleSegments = [
    ...pathSegments.slice(0, storiesDirectoryIndex),
    ...pathSegments.slice(storiesDirectoryIndex + 1, -1),
    storyFilename.slice(0, -".stories.tsx".length),
  ];

  return storyTitleSegments.join("/");
}

const storyTitleConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require Storybook meta.title to match the package-relative story file path with structural "src/" and "stories/" segments removed',
    },
    schema: [],
    messages: {
      missingStoryTitle:
        'Add `title: "{{ expectedTitle }}"` to this meta object. Storybook titles must match the package-relative story path without the structural `src/` or `stories/` segments.',
      unexpectedStoryTitle:
        'Set this title to "{{ expectedTitle }}". Storybook titles must match the package-relative story path without the structural `src/` or `stories/` segments.',
    },
  },
  create(context) {
    return {
      Program(node: AstProgram) {
        const expectedTitle = readExpectedStoryTitle(context.filename);
        if (!expectedTitle) {
          return;
        }

        const metaInfo = readMetaInfo(node);
        if (!metaInfo) {
          return;
        }

        const titleProperty = readTitleProperty(metaInfo.objectExpression);
        if (!titleProperty) {
          context.report({
            node: metaInfo.declaratorId,
            messageId: "missingStoryTitle",
            data: {
              expectedTitle,
            },
          });
          return;
        }

        const titleValue = readStaticStringValue(titleProperty.value);
        if (titleValue === expectedTitle) {
          return;
        }

        context.report({
          node: titleProperty.value,
          messageId: "unexpectedStoryTitle",
          data: {
            expectedTitle,
          },
        });
      },
    };
  },
};

export default storyTitleConventionRule;
