import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import fixtureImportPathConventionRuleModule from "../fixture-import-path-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureImportPathConventionRuleTester = new RuleTester();

fixtureImportPathConventionRuleTester.run(
  "fixture-import-path-convention restricts tests to named fixture_ and factory_ imports from the colocated fixtures module",
  fixtureImportPathConventionRuleModule,
  {
    valid: [
      {
        code: `
          import { fixture_userAccountRows } from "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { fixture_userAccountRows, factory_userAccountRows } from "./fixtures";
          import { describe, expect, it } from "bun:test";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { userAccountRows } from "../buildRows";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { fixture_userAccountRows } from "./fixtures.ts";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportPath",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { factory_userAccountRows } from "./fixtures.js";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportPath",
            data: {
              name: "factory_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { fixture_userAccountRows as userAccountRows } from "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportAlias",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { userAccountRows } from "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportName",
            data: {
              name: "userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import fixtures from "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportStyle",
          },
        ],
        output: null,
      },
      {
        code: `
          import * as fixtures from "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportStyle",
          },
        ],
        output: null,
      },
      {
        code: `
          import "./fixtures";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportStyle",
          },
        ],
        output: null,
      },
      {
        code: `
          import { fixture_userAccountRows } from "../shared/fixtures.ts";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportPath",
            data: {
              name: "fixture_userAccountRows",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import fixture_userAccountRows from "../shared/fixtureSource";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidFixturesImportPath",
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
