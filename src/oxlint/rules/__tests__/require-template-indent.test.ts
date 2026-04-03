import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import requireTemplateIndentRuleModule from "../require-template-indent.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const requireTemplateIndentRuleTester = new RuleTester();

requireTemplateIndentRuleTester.run(
  "require-template-indent keeps multiline template literals aligned with surrounding code",
  requireTemplateIndentRuleModule,
  {
    valid: [
      {
        code: "const content = `\nexport default {};\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
      },
      {
        code: "const content = `\n  export default {};\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
      },
      {
        code: "const message = `ready`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
      },
      {
        code: "const content = `\n\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
      },
      {
        code: "const content = `\n  export ${name}\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: "  const content = `\nexport default {};\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "badIndent",
          },
        ],
        output: null,
      },
      {
        code: "function readContent(): string {\n  return `\n line one\n`;\n}",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "badIndent",
          },
        ],
        output: null,
      },
    ],
  },
);
