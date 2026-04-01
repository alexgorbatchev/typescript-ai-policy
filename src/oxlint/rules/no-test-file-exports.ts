import type { RuleModule } from "./types.ts";
import { getBaseName } from "./helpers.ts";

const TEST_FILE_NAME_PATTERN = /\.test\.tsx?$/u;

const noTestFileExportsRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Ban exports from .test.ts and .test.tsx files",
    },
    schema: [],
    messages: {
      unexpectedTestExport:
        "Remove this export from the test file. Move shared test code into helpers.ts, fixtures.ts, or fixtures/ instead.",
    },
  },
  create(context) {
    if (!TEST_FILE_NAME_PATTERN.test(getBaseName(context.filename))) {
      return {};
    }

    return {
      ExportAllDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedTestExport",
        });
      },
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedTestExport",
        });
      },
      ExportNamedDeclaration(node) {
        context.report({
          node,
          messageId: "unexpectedTestExport",
        });
      },
      TSExportAssignment(node) {
        context.report({
          node,
          messageId: "unexpectedTestExport",
        });
      },
    };
  },
};

export default noTestFileExportsRule;
