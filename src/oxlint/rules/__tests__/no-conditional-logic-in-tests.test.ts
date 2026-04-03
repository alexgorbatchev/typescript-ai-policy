import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noConditionalLogicInTestsRuleModule from "../no-conditional-logic-in-tests.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noConditionalLogicInTestsRuleTester = new RuleTester();

noConditionalLogicInTestsRuleTester.run(
  "no-conditional-logic-in-tests bans branching control flow in committed tests",
  noConditionalLogicInTestsRuleModule,
  {
    valid: [
      {
        code: `
          import assert from 'node:assert';
          import { expect, test } from 'bun:test';

          test('reads the error branch', () => {
            const result = { error: 'failed', success: false };

            assert(!result.success);
            expect(result.error).toBe('failed');
          });
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function readLabel(isReady: boolean): string {
            if (isReady) {
              return 'ready';
            }

            return 'idle';
          }
        `,
        filename: "src/widgets/__tests__/helpers.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { expect, test } from 'bun:test';

          test('checks the failure path', () => {
            const result = { error: 'failed', success: false };

            if (!result.success) {
              expect(result.error).toBe('failed');
            }
          });
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenConditionalLogic",
            data: {
              conditionalKind: '"if" statement',
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { test } from 'bun:test';

          test('branches with switch', () => {
            const status = 'ready';

            switch (status) {
              case 'ready': {
                break;
              }
              default: {
                throw new Error('unexpected');
              }
            }
          });
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenConditionalLogic",
            data: {
              conditionalKind: '"switch" statement',
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { expect, test } from 'bun:test';

          test('branches with a ternary', () => {
            const result = { isReady: true };

            expect(result.isReady ? 'ready' : 'idle').toBe('ready');
          });
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenConditionalLogic",
            data: {
              conditionalKind: "ternary expression",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
