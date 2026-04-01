import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import testFileLocationConventionRuleModule from "../test-file-location-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const testFileLocationConventionRuleTester = new RuleTester();

testFileLocationConventionRuleTester.run(
  "test-file-location-convention requires colocated test files",
  testFileLocationConventionRuleModule,
  {
    valid: [
      {
        code: `
          import { test } from 'bun:test';

          test('renders', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { expect } from 'bun:test';

          export const assertReady = () => expect(true).toBe(true);
        `,
        filename: "src/widgets/__tests__/helpers.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { describe } from 'node:test';

          describe('SignalPanel', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { test } from 'bun:test';

          test('renders', () => {});
        `,
        filename: "src/widgets/SignalPanel.test.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingTestsDirectory",
          },
        ],
        output: null,
      },
      {
        code: `
          import { test } from 'bun:test';

          test('renders', () => {});
        `,
        filename: "src/widgets/__tests__/SignalPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestFileName",
          },
        ],
        output: null,
      },
      {
        code: `
          import { describe } from 'bun:test';

          describe('SignalPanel', () => {});
        `,
        filename: "src/widgets/SignalPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingTestsDirectory",
          },
          {
            messageId: "invalidTestFileName",
          },
        ],
        output: null,
      },
      {
        code: `export const fixture = true;`,
        filename: "src/widgets/__tests__/SignalPanel.spec.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestFileName",
          },
        ],
        output: null,
      },
    ],
  },
);
