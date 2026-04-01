import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import fixtureFileContractRuleModule from "../fixture-file-contract.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureFileContractRuleTester = new RuleTester();

fixtureFileContractRuleTester.run(
  "fixture-file-contract restricts fixture entrypoint exports to direct const and function declarations",
  fixtureFileContractRuleModule,
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
          export default { fixture_userAccountRows: [] };
        `,
        filename: "src/accounts/fixtures.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export default { fixture_userAccountRows: [] };
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedDefaultExport",
          },
        ],
        output: null,
      },
      {
        code: `
          export let fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedVariableKind",
            data: {
              kind: "let",
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
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedExportList",
          },
        ],
        output: null,
      },
      {
        code: `
          export type FixtureRow = { id: string };
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedExportDeclaration",
          },
        ],
        output: null,
      },
      {
        code: `
          export default { fixture_userAccountRows: [] };
        `,
        filename: "src/accounts/components/stories/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedDefaultExport",
          },
        ],
        output: null,
      },
      {
        code: `
          const rows = [{ id: "1" }];
          export const { fixture_userAccountRows } = { fixture_userAccountRows: rows };
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedExportPattern",
          },
        ],
        output: null,
      },
    ],
  },
);
