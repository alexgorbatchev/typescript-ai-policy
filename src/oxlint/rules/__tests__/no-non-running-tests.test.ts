import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noNonRunningTestsRuleModule from "../no-non-running-tests.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noNonRunningTestsRuleTester = new RuleTester();

noNonRunningTestsRuleTester.run(
  "no-non-running-tests rejects non-running test modifiers",
  noNonRunningTestsRuleModule,
  {
    valid: [
      {
        code: `
          import { describe, it, test } from 'bun:test';

          describe('SignalPanel', () => {
            it('renders', () => {});
          });

          test('BeaconPanel', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          test('renders', () => {});
        `,
        filename: "src/widgets/__tests__/BeaconPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          test.todo('document later');
        `,
        filename: "src/widgets/__tests__/helpers.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          test.skipIf(process.env.CI === 'true')('renders', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenModifier",
            data: {
              fullName: "test.skipIf",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          describe.if(true)('SignalPanel', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenModifier",
            data: {
              fullName: "describe.if",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          it.todo('write this test');
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenModifier",
            data: {
              fullName: "it.todo",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          test.todoIf(true)('write this test');
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenModifier",
            data: {
              fullName: "test.todoIf",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
