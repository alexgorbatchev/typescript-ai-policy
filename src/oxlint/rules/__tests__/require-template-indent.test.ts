import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import requireTemplateIndentRuleModule from "../require-template-indent.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const requireTemplateIndentRuleTester = new RuleTester();

const EXPECTED_REQUIRE_TEMPLATE_INDENT_GUIDANCE =
  "Indent multiline template literal content to match the surrounding code. Normalize indentation explicitly when the resulting string must be left-aligned.";

const EXPECTED_REQUIRE_TEMPLATE_INDENT_MESSAGE =
  "Indent this multiline template literal to match the surrounding code. Normalize indentation in code instead of relying on under-indented source text.";

it("uses the approved template indent guidance and message", () => {
  expect(requireTemplateIndentRuleModule.meta.docs?.guidance).toBe(EXPECTED_REQUIRE_TEMPLATE_INDENT_GUIDANCE);
  expect(requireTemplateIndentRuleModule.meta.messages?.badIndent).toBe(EXPECTED_REQUIRE_TEMPLATE_INDENT_MESSAGE);
});

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
        output: "  const content = `\n  export default {};\n`;",
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
        output: "function readContent(): string {\n  return `\n  line one\n`;\n}",
      },
      {
        code: "  const content = `\nexport ${name}\n  nested value\n`;",
        filename: "src/widgets/content.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "badIndent",
          },
        ],
        output: "  const content = `\n  export ${name}\n    nested value\n`;",
      },
    ],
  },
);
