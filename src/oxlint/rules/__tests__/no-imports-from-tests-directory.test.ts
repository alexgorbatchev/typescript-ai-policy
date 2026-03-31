import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noImportsFromTestsDirectoryRuleModule from "../no-imports-from-tests-directory.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noImportsFromTestsDirectoryRuleTester = new RuleTester();

noImportsFromTestsDirectoryRuleTester.run(
  "no-imports-from-tests-directory keeps non-test files from depending on __tests__ modules",
  noImportsFromTestsDirectoryRuleModule,
  {
    valid: [
      {
        code: `
          import { buildRows } from "./buildRows";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { renderAccountRows } from "../shared/__tests__/helpers";
        `,
        filename: "src/accounts/__tests__/rows.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const renderAccountRows = require("./helpers");
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { renderAccountRows } from "./__tests__/helpers";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "./__tests__/helpers",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import type { AccountRowsFixture } from "../shared/__tests__/fixtures";
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "../shared/__tests__/fixtures",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export { renderAccountRows } from "./__tests__/helpers";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "./__tests__/helpers",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export * from "../shared/__tests__";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "../shared/__tests__",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          async function loadHelpers() {
            return import("./__tests__/helpers");
          }
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "./__tests__/helpers",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const renderAccountRows = require("./__tests__/helpers");
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "./__tests__/helpers",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import accountRowsHelpers = require("./__tests__");
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTestsDirectoryImport",
            data: {
              importPath: "./__tests__",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
