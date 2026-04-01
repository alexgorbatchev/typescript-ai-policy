import type { AstProgramStatement, RuleModule } from "./types.ts";
import { getBaseName } from "./helpers.ts";

type IndexMessageId = "unexpectedIndexExport" | "unexpectedIndexStatement";

function isIndexModuleFile(filename: string): boolean {
  const baseName = getBaseName(filename);

  return baseName === "index.ts" || baseName === "index.tsx";
}

function isIndexTsxFile(filename: string): boolean {
  return getBaseName(filename) === "index.tsx";
}

function isAllowedIndexReExport(node: AstProgramStatement): boolean {
  return (
    node.type === "ExportAllDeclaration" ||
    (node.type === "ExportNamedDeclaration" && node.source !== null && node.declaration === null)
  );
}

function readUnexpectedMessageId(node: AstProgramStatement): IndexMessageId {
  if (
    node.type === "ExportNamedDeclaration" ||
    node.type === "ExportDefaultDeclaration" ||
    node.type === "TSExportAssignment"
  ) {
    return "unexpectedIndexExport";
  }

  return "unexpectedIndexStatement";
}

const indexFileContractRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: 'Require "index.ts" files to contain re-exports only and forbid "index.tsx" barrels',
    },
    schema: [],
    messages: {
      unexpectedIndexTsxFilename:
        'Rename this file to "index.ts". Index barrel files must not use the ".tsx" extension.',
      unexpectedIndexExport:
        'Remove this local export from the index file. "index.ts" must not define symbols; move the definition into another module and re-export it from here instead.',
      unexpectedIndexStatement:
        'Remove this statement from the index file. "index.ts" may contain re-export statements only.',
    },
  },
  create(context) {
    if (!isIndexModuleFile(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        if (isIndexTsxFile(context.filename)) {
          context.report({
            node,
            messageId: "unexpectedIndexTsxFilename",
          });
        }

        node.body.forEach((statement) => {
          if (isAllowedIndexReExport(statement)) {
            return;
          }

          context.report({
            node: statement,
            messageId: readUnexpectedMessageId(statement),
          });
        });
      },
    };
  },
};

export default indexFileContractRule;
