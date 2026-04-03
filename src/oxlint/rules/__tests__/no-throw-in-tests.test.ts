import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noThrowInTestsRuleModule from "../no-throw-in-tests.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noThrowInTestsRuleTester = new RuleTester();

noThrowInTestsRuleTester.run("no-throw-in-tests bans throw new Error in committed tests", noThrowInTestsRuleModule, {
  valid: [
    {
      code: `
        import assert from 'node:assert';
        import { test } from 'bun:test';

        test('fails explicitly', () => {
          assert.fail('unexpected state');
        });
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        export function failWithMessage(message: string): never {
          throw new Error(message);
        }
      `,
      filename: "src/widgets/__tests__/helpers.ts",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `
        import { test } from 'bun:test';

        test('throws on unexpected state', () => {
          throw new Error('unexpected state');
        });
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "forbiddenThrowNewError",
        },
      ],
      output: null,
    },
    {
      code: `
        import { test } from 'bun:test';

        test('throws inside a catch path', () => {
          try {
            JSON.parse(']');
          } catch (error) {
            throw new Error('parse failed');
          }
        });
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "forbiddenThrowNewError",
        },
      ],
      output: null,
    },
  ],
});
