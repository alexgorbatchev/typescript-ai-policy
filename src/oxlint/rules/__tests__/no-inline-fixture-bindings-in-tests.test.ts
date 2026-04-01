import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noInlineFixtureBindingsInTestsRuleModule from "../no-inline-fixture-bindings-in-tests.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noInlineFixtureBindingsInTestsRuleTester = new RuleTester();

noInlineFixtureBindingsInTestsRuleTester.run(
  "no-inline-fixture-bindings-in-tests forces tests to import fixture_ and factory_ bindings",
  noInlineFixtureBindingsInTestsRuleModule,
  {
    valid: [
      {
        code: `
          import { fixture_userAccountRows, factory_userAccountRows } from "./fixtures";

          describe("account rows", () => {
            it("uses imported fixtures", () => {
              expect(fixture_userAccountRows).toBeArray();
              expect(factory_userAccountRows()).toBeArray();
            });
          });
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/rows.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineFixtureBinding",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          function factory_userAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineFixtureBinding",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const { fixture_userAccountRows } = { fixture_userAccountRows: [{ id: "1" }] };
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineFixtureBinding",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          function factory_userAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/components/stories/AccountPanel.stories.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineFixtureBinding",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
