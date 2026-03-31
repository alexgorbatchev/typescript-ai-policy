import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getFilenameWithoutExtension, isExemptSupportBasename } from "./helpers.js";

function readRequiredComponentTestFilePath(filename) {
  const sourceBaseName = getFilenameWithoutExtension(filename);

  return join(dirname(filename), "__tests__", `${sourceBaseName}.test.tsx`);
}

const componentTestFileConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: 'Require every component ownership file to have a sibling "__tests__/basename.test.tsx" file',
    },
    schema: [],
    messages: {
      missingComponentTestFile:
        'Add the colocated component test file at "{{ requiredTestFilePath }}". Component ownership files must have a sibling "__tests__/basename.test.tsx" test.',
    },
  },
  create(context) {
    if (isExemptSupportBasename(context.filename)) {
      return {};
    }

    return {
      Program(node) {
        const requiredTestFilePath = readRequiredComponentTestFilePath(context.filename);
        if (existsSync(requiredTestFilePath)) {
          return;
        }

        context.report({
          node,
          messageId: "missingComponentTestFile",
          data: {
            requiredTestFilePath,
          },
        });
      },
    };
  },
};

export default componentTestFileConventionRule;
