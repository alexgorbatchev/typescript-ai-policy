import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noFixtureExportsOutsideFixtureEntrypointRuleModule from "../no-fixture-exports-outside-fixture-entrypoint.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noFixtureExportsOutsideFixtureEntrypointRuleTester = new RuleTester();

noFixtureExportsOutsideFixtureEntrypointRuleTester.run(
  "no-fixture-exports-outside-fixture-entrypoint keeps fixture exports inside the fixture entrypoint",
  noFixtureExportsOutsideFixtureEntrypointRuleModule,
  {
    valid: [
      {
        code: `
          export const fixture_userAccountRows = [{ id: "1" }];
          export function factory_userAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const fixture_userAccountRows = <div />;
        `,
        filename: "src/accounts/__tests__/fixtures.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/components/stories/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const fixture_userAccountRows = [{ id: "1" }];
          export const userAccountRows = fixture_userAccountRows;
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedFixtureExport",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function factory_userAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedFixtureExport",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const fixture_userAccountRows = [{ id: "1" }];
          export { fixture_userAccountRows };
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedFixtureExport",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export { fixture_userAccountRows } from "./__tests__/fixtures.ts";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedFixtureExport",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
