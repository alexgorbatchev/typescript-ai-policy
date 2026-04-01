import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import fixtureExportNamingConventionRuleModule from "../fixture-export-naming-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureExportNamingConventionRuleTester = new RuleTester();

fixtureExportNamingConventionRuleTester.run(
  "fixture-export-naming-convention enforces lowerCamelCase fixture_ and factory_ entrypoint export names",
  fixtureExportNamingConventionRuleModule,
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
          export const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/fixtures.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export const userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixtureExportName",
            data: {
              name: "userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export const fixture_UserAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixtureExportName",
            data: {
              name: "fixture_UserAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function makeUserAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFactoryExportName",
            data: {
              name: "makeUserAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function factory_UserAccountRows() {
            return [{ id: "1" }];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFactoryExportName",
            data: {
              name: "factory_UserAccountRows",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
