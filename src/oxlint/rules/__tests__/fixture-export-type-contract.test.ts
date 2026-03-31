import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import fixtureExportTypeContractRuleModule from "../fixture-export-type-contract.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureExportTypeContractRuleTester = new RuleTester();

fixtureExportTypeContractRuleTester.run(
  "fixture-export-type-contract requires imported type contracts for fixture entrypoint exports",
  fixtureExportTypeContractRuleModule,
  {
    valid: [
      {
        code: `
          import type { UserRow } from "../UserRow";

          export const fixture_userAccountRows: UserRow[] = [];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { UserRow } from "../UserRow";

          export const fixture_userAccountRows = [] satisfies UserRow[];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { UserRow } from "../UserRow";

          export function factory_userAccountRows(): UserRow[] {
            return [];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { UserRow } from "../UserRow";

          export const fixture_userAccountRows: UserRow[] = [];
        `,
        filename: "src/accounts/__tests__/fixtures.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          type UserRow = { id: string };
          export const fixture_userAccountRows: UserRow[] = [];
        `,
        filename: "src/accounts/helpers.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export const fixture_userAccountRows = [];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingFixtureTypeContract",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          type UserRow = { id: string };

          export const fixture_userAccountRows: UserRow[] = [];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingImportedFixtureType",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export const fixture_userAccountRows: any[] = [];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenFixtureTypeKeyword",
            data: {
              name: "fixture_userAccountRows",
              keyword: "any",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export const fixture_userAccountRows = [] satisfies unknown[];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenFixtureTypeKeyword",
            data: {
              name: "fixture_userAccountRows",
              keyword: "unknown",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import type { UserRow } from "../UserRow";

          export const fixture_userAccountRows: UserRow[] = [] satisfies unknown[];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenFixtureTypeKeyword",
            data: {
              name: "fixture_userAccountRows",
              keyword: "unknown",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function factory_userAccountRows() {
            return [];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingFactoryReturnTypeContract",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          type UserRow = { id: string };

          export function factory_userAccountRows(): UserRow[] {
            return [];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingImportedFactoryReturnType",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function factory_userAccountRows(): any[] {
            return [];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenFactoryReturnTypeKeyword",
            data: {
              name: "factory_userAccountRows",
              keyword: "any",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function factory_userAccountRows(): unknown[] {
            return [];
          }
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "forbiddenFactoryReturnTypeKeyword",
            data: {
              name: "factory_userAccountRows",
              keyword: "unknown",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
