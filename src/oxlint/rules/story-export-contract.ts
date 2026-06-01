import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, RuleModule } from "./types.ts";
import {
  getStorySourceBaseName,
  isPascalCase,
  readProgramReportNode,
  unwrapExpression,
  unwrapTypeScriptExpression,
} from "./helpers.ts";

type StoryExportRecord = {
  exportedName: string;
  kind: "declaration" | "specifier";
  localName: string;
  node: TSESTree.ExportSpecifier | TSESTree.VariableDeclarator;
};

type StoryCandidateEntry = {
  declaration: TSESTree.VariableDeclaration;
  declarator: TSESTree.VariableDeclarator & { id: TSESTree.Identifier; init: TSESTree.Expression };
  exports: StoryExportRecord[];
  name: string;
};

type StorybookTestTagDirective = "test" | "!test";

function readDefaultExportDeclaration(program: AstProgram): TSESTree.ExportDefaultDeclaration | null {
  return program.body.find((statement) => statement.type === "ExportDefaultDeclaration") ?? null;
}

function readExpectedComponentNameFromStoryFilename(filename: string): string | null {
  const storySourceBaseName = getStorySourceBaseName(filename);
  if (!storySourceBaseName) {
    return null;
  }

  if (isPascalCase(storySourceBaseName)) {
    return storySourceBaseName;
  }

  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(storySourceBaseName)) {
    return null;
  }

  return storySourceBaseName
    .split("-")
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join("");
}

function isStoryTypeReference(typeAnnotation: TSESTree.TypeNode | null | undefined): boolean {
  return (
    typeAnnotation?.type === "TSTypeReference" &&
    typeAnnotation.typeName.type === "Identifier" &&
    typeAnnotation.typeName.name === "Story" &&
    !typeAnnotation.typeArguments
  );
}

function readStoryAssertionTypeAnnotation(expression: TSESTree.Expression): TSESTree.TypeNode | null {
  const unwrappedExpression = unwrapExpression(expression);
  if (unwrappedExpression.type !== "TSAsExpression" && unwrappedExpression.type !== "TSSatisfiesExpression") {
    return null;
  }

  return unwrappedExpression.typeAnnotation;
}

function readStoryObjectExpression(expression: TSESTree.Expression): TSESTree.ObjectExpression | null {
  const unwrappedExpression = unwrapTypeScriptExpression(expression);

  return unwrappedExpression.type === "ObjectExpression" ? unwrappedExpression : null;
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

function readObjectPropertyByName(
  objectExpression: TSESTree.ObjectExpression,
  propertyName: string,
): TSESTree.Property | null {
  const matchingProperty = objectExpression.properties.find((property) => {
    return property.type === "Property" && readPropertyName(property) === propertyName;
  });

  return matchingProperty?.type === "Property" ? matchingProperty : null;
}

function isExpressionPropertyValue(value: TSESTree.Property["value"]): value is TSESTree.Expression {
  switch (value.type) {
    case "ArrayPattern":
    case "AssignmentPattern":
    case "ObjectPattern":
    case "TSEmptyBodyFunctionExpression":
      return false;
    default:
      return true;
  }
}

function readStorybookTestTagDirectivesFromExpression(expression: TSESTree.Expression): StorybookTestTagDirective[] {
  const objectExpression = readStoryObjectExpression(expression);
  if (!objectExpression) {
    return [];
  }

  const tagsProperty = readObjectPropertyByName(objectExpression, "tags");
  if (!tagsProperty) {
    return [];
  }

  if (!isExpressionPropertyValue(tagsProperty.value)) {
    return [];
  }

  const tagsExpression = unwrapTypeScriptExpression(tagsProperty.value);
  if (tagsExpression.type !== "ArrayExpression") {
    return [];
  }

  return tagsExpression.elements.flatMap((element) => {
    if (element?.type !== "Literal") {
      return [];
    }

    return element.value === "test" || element.value === "!test" ? [element.value] : [];
  });
}

function readStorybookTestTagDirectivesFromMetaBinding(
  program: AstProgram,
  metaBindingName: string | null,
): StorybookTestTagDirective[] {
  if (!metaBindingName) {
    return [];
  }

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration") {
      continue;
    }

    for (const declarator of statement.declarations) {
      if (declarator.id.type !== "Identifier" || declarator.id.name !== metaBindingName || declarator.init === null) {
        continue;
      }

      return readStorybookTestTagDirectivesFromExpression(declarator.init);
    }
  }

  return [];
}

function readRequiresStoryPlay(
  storyExpression: TSESTree.Expression,
  metaTagDirectives: StorybookTestTagDirective[],
): boolean {
  const storyTagDirectives = readStorybookTestTagDirectivesFromExpression(storyExpression);
  const combinedTagDirectives = [...metaTagDirectives, ...storyTagDirectives];

  return combinedTagDirectives.reduce<boolean>((isTestEnabled, tagDirective) => {
    if (tagDirective === "!test") {
      return false;
    }

    return true;
  }, true);
}

function hasPlayProperty(expression: TSESTree.Expression): boolean {
  const storyObjectExpression = readStoryObjectExpression(expression);
  if (!storyObjectExpression) {
    return false;
  }

  return storyObjectExpression.properties.some((property) => {
    return property.type === "Property" && readPropertyName(property) === "play";
  });
}

function isStoryDeclarator(declarator: TSESTree.VariableDeclarator): declarator is StoryCandidateEntry["declarator"] {
  return declarator.id.type === "Identifier" && declarator.init !== null;
}

function readTopLevelStoryCandidateEntries(program: AstProgram): StoryCandidateEntry[] {
  const entriesByName = new Map<string, StoryCandidateEntry>();

  function upsertEntry(
    variableDeclaration: TSESTree.VariableDeclaration,
    declarator: TSESTree.VariableDeclarator,
  ): StoryCandidateEntry | null {
    if (!isStoryDeclarator(declarator)) {
      return null;
    }

    const existingEntry = entriesByName.get(declarator.id.name);
    if (existingEntry) {
      return existingEntry;
    }

    const entry: StoryCandidateEntry = {
      name: declarator.id.name,
      declaration: variableDeclaration,
      declarator,
      exports: [],
    };

    entriesByName.set(entry.name, entry);
    return entry;
  }

  function recordVariableDeclaration(variableDeclaration: TSESTree.VariableDeclaration, isDirectExport: boolean): void {
    variableDeclaration.declarations.forEach((declarator) => {
      const entry = upsertEntry(variableDeclaration, declarator);
      if (!entry || !isDirectExport) {
        return;
      }

      entry.exports.push({
        kind: "declaration",
        localName: entry.name,
        exportedName: entry.name,
        node: declarator,
      });
    });
  }

  program.body.forEach((statement) => {
    if (statement.type === "VariableDeclaration") {
      recordVariableDeclaration(statement, false);
      return;
    }

    if (
      statement.type === "ExportNamedDeclaration" &&
      statement.exportKind !== "type" &&
      statement.declaration?.type === "VariableDeclaration"
    ) {
      recordVariableDeclaration(statement.declaration, true);
    }
  });

  program.body.forEach((statement) => {
    if (
      statement.type !== "ExportNamedDeclaration" ||
      statement.declaration ||
      statement.source ||
      statement.exportKind === "type"
    ) {
      return;
    }

    statement.specifiers.forEach((specifier) => {
      if (
        specifier.type !== "ExportSpecifier" ||
        specifier.exportKind === "type" ||
        specifier.local.type !== "Identifier" ||
        specifier.exported.type !== "Identifier"
      ) {
        return;
      }

      const entry = entriesByName.get(specifier.local.name);
      if (!entry) {
        return;
      }

      entry.exports.push({
        kind: "specifier",
        localName: specifier.local.name,
        exportedName: specifier.exported.name,
        node: specifier,
      });
    });
  });

  return [...entriesByName.values()];
}

function isStoryCandidateEntry(entry: StoryCandidateEntry, metaBindingName: string | null): boolean {
  if (!entry.declarator.init || entry.name === metaBindingName) {
    return false;
  }

  if (!readStoryObjectExpression(entry.declarator.init)) {
    return false;
  }

  const hasStoryTypeContract =
    isStoryTypeReference(entry.declarator.id.typeAnnotation?.typeAnnotation) ||
    isStoryTypeReference(readStoryAssertionTypeAnnotation(entry.declarator.init));

  return entry.exports.length > 0 || hasStoryTypeContract;
}

const storyExportContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require Storybook story exports to use `const StoryName: Story = { ... }` bindings, enforce the single-vs-multiple export contract, and require `play` unless `!test` removes the built-in Storybook test tag",
      guidance:
        'Keep story exports limited to the approved Storybook surface. Give each exported story a typed `Story` binding and a `play` function unless `meta.tags` or `story.tags` remove the built-in `test` tag with `"!test"`. Move helper bindings and support code out of story files.',
    },
    schema: [],
    messages: {
      missingStoryExport:
        "Export at least one story object after the default meta. Keep story files focused on the approved Storybook surface.",
      unexportedStoryBinding:
        "Export this story binding. Story objects in story files must be part of the public Storybook surface.",
      missingStoryTypeAnnotation:
        "Annotate this story binding as `: Story`. Do not rely on inference for story objects.",
      unexpectedStoryTypeAssertion:
        "Replace this story assertion with a const type annotation. Keep story types on the binding, not on the object expression.",
      missingStoryPlay:
        'Add a `play` property to this story object. Only stories excluded from Storybook test runs with `"!test"` may omit it.',
      invalidSingleStoryExportShape:
        "Use the single-story export shape for single-story files. Export one `Default` binding and re-export it as the sibling component name.",
      invalidMultiStoryExportShape:
        "Export multiple stories directly from their declarations. Do not re-export local story bindings through an export list.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const defaultExportDeclaration = readDefaultExportDeclaration(node);
        const metaBindingName =
          defaultExportDeclaration?.declaration.type === "Identifier"
            ? defaultExportDeclaration.declaration.name
            : null;
        const metaTagDirectives = readStorybookTestTagDirectivesFromMetaBinding(node, metaBindingName);
        const storyEntries = readTopLevelStoryCandidateEntries(node).filter((entry) => {
          return isStoryCandidateEntry(entry, metaBindingName);
        });

        if (storyEntries.length === 0) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "missingStoryExport",
          });
          return;
        }

        storyEntries.forEach((storyEntry) => {
          if (storyEntry.exports.length === 0) {
            context.report({
              node: storyEntry.declarator.id,
              messageId: "unexportedStoryBinding",
            });
          }

          const storyAssertionTypeAnnotation = readStoryAssertionTypeAnnotation(storyEntry.declarator.init);
          if (storyAssertionTypeAnnotation && isStoryTypeReference(storyAssertionTypeAnnotation)) {
            context.report({
              node: storyEntry.declarator.init,
              messageId: "unexpectedStoryTypeAssertion",
            });
          }

          if (!isStoryTypeReference(storyEntry.declarator.id.typeAnnotation?.typeAnnotation)) {
            context.report({
              node: storyEntry.declarator.id,
              messageId: "missingStoryTypeAnnotation",
            });
          }

          if (
            readRequiresStoryPlay(storyEntry.declarator.init, metaTagDirectives) &&
            !hasPlayProperty(storyEntry.declarator.init)
          ) {
            context.report({
              node: readStoryObjectExpression(storyEntry.declarator.init) ?? storyEntry.declarator,
              messageId: "missingStoryPlay",
            });
          }
        });

        const exportedStoryEntries = storyEntries.filter((storyEntry) => storyEntry.exports.length > 0);
        if (exportedStoryEntries.length === 0) {
          context.report({
            node: readProgramReportNode(node),
            messageId: "missingStoryExport",
          });
          return;
        }

        if (exportedStoryEntries.length === 1) {
          const singleStoryEntry = exportedStoryEntries[0];
          if (!singleStoryEntry) {
            return;
          }

          const expectedComponentName = readExpectedComponentNameFromStoryFilename(context.filename) ?? "ComponentName";
          const firstExport = singleStoryEntry.exports[0];
          const hasValidSingleStoryExportShape =
            singleStoryEntry.name === "Default" &&
            singleStoryEntry.exports.length === 1 &&
            firstExport?.kind === "specifier" &&
            firstExport.localName === "Default" &&
            firstExport.exportedName === expectedComponentName;

          if (!hasValidSingleStoryExportShape) {
            context.report({
              node: firstExport?.node ?? singleStoryEntry.declarator,
              messageId: "invalidSingleStoryExportShape",
              data: {
                componentName: expectedComponentName,
              },
            });
          }

          return;
        }

        exportedStoryEntries.forEach((storyEntry) => {
          const firstExport = storyEntry.exports[0];
          const hasValidMultiStoryExportShape =
            storyEntry.exports.length === 1 &&
            firstExport?.kind === "declaration" &&
            firstExport.exportedName === storyEntry.name;

          if (hasValidMultiStoryExportShape) {
            return;
          }

          context.report({
            node: firstExport?.node ?? storyEntry.declarator,
            messageId: "invalidMultiStoryExportShape",
          });
        });
      },
    };
  },
};

export default storyExportContractRule;
