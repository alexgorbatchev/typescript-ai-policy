import type { TSESTree } from "@typescript-eslint/types";
import type { AstProgram, AstProgramStatement, RuleModule } from "./types.ts";
import { dirname, join } from "node:path";
import {
  findDescendantFilePath,
  getFilenameWithoutExtension,
  isExemptSupportBasename,
  isInStoriesDirectory,
  isInTestsDirectory,
  readAbbreviatedSiblingDirectoryPath,
} from "./helpers.ts";

function readRequiredStoriesDirectoryPath(filename: string): string {
  return join(dirname(filename), "stories");
}

function readRequiredStoryFileName(filename: string): string {
  const sourceBaseName = getFilenameWithoutExtension(filename);

  return `${sourceBaseName}.stories.tsx`;
}

type ReportNode = AstProgramStatement | TSESTree.Node;

function readReportNode(program: AstProgram): ReportNode {
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

  return program.body[0] ?? program;
}

const componentStoryFileConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require every component ownership file to have a matching "basename.stories.tsx" file under a sibling "stories/" directory',
    },
    schema: [],
    messages: {
      missingComponentStoryFile:
        'Create "{{ requiredStoryFileName }}" under "{{ requiredStoriesDirectoryPath }}". Component ownership files must keep their Storybook coverage under a sibling "stories/" directory.',
    },
  },
  create(context) {
    if (
      isExemptSupportBasename(context.filename) ||
      isInStoriesDirectory(context.filename) ||
      isInTestsDirectory(context.filename)
    ) {
      return {};
    }

    return {
      Program(node: AstProgram) {
        const requiredStoriesDirectoryPath = readRequiredStoriesDirectoryPath(context.filename);
        const displayedStoriesDirectoryPath = readAbbreviatedSiblingDirectoryPath(context.filename, "stories");
        const requiredStoryFileName = readRequiredStoryFileName(context.filename);
        if (findDescendantFilePath(requiredStoriesDirectoryPath, requiredStoryFileName)) {
          return;
        }

        context.report({
          node: readReportNode(node),
          messageId: "missingComponentStoryFile",
          data: {
            requiredStoriesDirectoryPath: displayedStoriesDirectoryPath,
            requiredStoryFileName,
          },
        });
      },
    };
  },
};

export default componentStoryFileConventionRule;
