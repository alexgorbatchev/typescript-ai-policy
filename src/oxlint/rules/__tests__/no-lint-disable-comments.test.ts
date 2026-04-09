import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import ruleModule from "../no-lint-disable-comments.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("no-lint-disable-comments", ruleModule, {
  valid: [
    {
      code: `const a = 1; // regular comment`,
      filename: "test.ts",
      languageOptions: languageOpts,
    },
    {
      code: `/* regular block comment */`,
      filename: "test.ts",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `// oxlint-disable-next-line\nconst a = 1;`,
      filename: "test.ts",
      languageOptions: languageOpts,
      errors: [{ messageId: "unexpectedLintDisableComment" }],
      output: null,
    },
    {
      code: `/* oxlint-disable eqeqeq */\nconst a = 1;`,
      filename: "test.ts",
      languageOptions: languageOpts,
      errors: [{ messageId: "unexpectedLintDisableComment" }],
      output: null,
    },
  ],
});
