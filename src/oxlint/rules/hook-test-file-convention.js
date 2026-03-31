import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBaseName, getFilenameWithoutExtension, isExemptSupportBasename } from "./helpers.js";

function readRequiredHookTestFilePath(filename) {
  const sourceBaseName = getFilenameWithoutExtension(filename);
  const testExtension = getBaseName(filename).endsWith(".tsx") ? ".test.tsx" : ".test.ts";

  return join(dirname(filename), "__tests__", `${sourceBaseName}${testExtension}`);
}

const hookTestFileConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        'Require every hook ownership file to have a sibling "__tests__/basename.test.ts" or ".test.tsx" file that matches the source extension',
    },
    schema: [],
    messages: {
      missingHookTestFile:
        'Add the colocated hook test file at "{{ requiredTestFilePath }}". Hook ownership files must have a sibling "__tests__/basename.test.ts" or ".test.tsx" file with the same source extension.',
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const requiredTestFilePath = readRequiredHookTestFilePath(context.filename);
        if (existsSync(requiredTestFilePath)) {
          return;
        }

        context.report({
          node,
          messageId: "missingHookTestFile",
          data: {
            requiredTestFilePath,
          },
        });
      },
    };
  },
};

export default hookTestFileConventionRule;
