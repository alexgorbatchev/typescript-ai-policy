import type { AstNode, AstProgram, RuleModule } from "./types.ts";
import { isReactClientEntrypoint } from "./helpers.ts";
import { readProgramReportNode } from "./helpers.ts";
import { isRuntimeComponentOwnershipFile } from "./componentOwnership/componentOwnershipRole.ts";
import { StoryOwnershipIndex } from "./componentOwnership/StoryOwnershipIndex.ts";

function readReportNode(program: AstProgram): AstNode {
  for (const statement of program.body) {
    if (statement.type === "ExportNamedDeclaration") {
      if (statement.exportKind === "type") {
        continue;
      }

      if (!statement.declaration) {
        return statement.specifiers[0] ?? statement;
      }

      if (
        statement.declaration.type === "FunctionDeclaration" ||
        statement.declaration.type === "ClassDeclaration" ||
        statement.declaration.type === "TSEnumDeclaration"
      ) {
        return statement.declaration.id ?? statement.declaration;
      }

      if (statement.declaration.type === "VariableDeclaration") {
        const firstDeclarator = statement.declaration.declarations[0];
        return firstDeclarator?.id.type === "Identifier"
          ? firstDeclarator.id
          : (firstDeclarator ?? statement.declaration);
      }

      return statement.declaration;
    }

    if (statement.type === "ExportDefaultDeclaration" || statement.type === "TSExportAssignment") {
      return statement;
    }

    if (statement.type === "ExportAllDeclaration" && statement.exportKind !== "type") {
      return statement;
    }
  }

  return readProgramReportNode(program);
}

const componentStoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Require every runtime component ownership file to have a matching story that resolves to its exact source binding",
      guidance:
        "Add a same-basename story under a stories directory in the same component area and package. Its typed meta and effective component property must resolve to this source; a story for another same-named component does not satisfy ownership.",
    },
    schema: [],
    messages: {
      missingComponentStoryFile:
        'Create a matching ".stories.tsx" file whose typed meta and component property resolve to this component. Keep it under a stories directory in the same ownership area.',
    },
  },
  create(context) {
    if (!isRuntimeComponentOwnershipFile(context.filename)) {
      return {};
    }

    const ownership = new StoryOwnershipIndex(context.filename, context.sourceCode.text);
    return {
      Program(node: AstProgram) {
        if (isReactClientEntrypoint(context.filename, node)) return;
        if (ownership.hasStory(context.filename)) {
          return;
        }

        context.report({
          node: readReportNode(node),
          messageId: "missingComponentStoryFile",
        });
      },
    };
  },
};

export default componentStoryFileConventionRule;
