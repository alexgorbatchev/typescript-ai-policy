import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noFixtureExportsOutsideFixtureEntrypointRuleModule from "../no-fixture-exports-outside-fixture-entrypoint.ts";

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
      ...[
        "src/accounts/__tests__/fixtures/index.ts",
        "src/accounts/components/stories/fixtures/index.ts",
        "src/accounts/__tests__/nested/fixtures/index.ts",
        "C:\\work\\src\\accounts\\__tests__\\fixtures\\index.ts",
      ].flatMap((filename) =>
        [
          'export { fixture_rows, factory_rows } from "./fixtures.ts";',
          'export { fixture_rows } from "./fixtures.tsx";',
          'export { fixture_rows } from "./nested/fixtures.ts";',
          'export { fixture_rows } from "./nested/../fixtures.ts";',
          'export * from "./fixtures.ts";',
          'export * from "./fixtures.tsx";',
          'export * from "./nested/fixtures.ts";',
        ].map((code) => ({ code, filename, languageOptions: languageOpts })),
      ),
      ...[
        'export * from "./runtime.ts";',
        'export { value } from "./runtime.ts";',
        'export * from "./fixtures.ts";',
        'export * from "./fixture-support/value.ts";',
        'export * from "fixture-package";',
        'export type * from "./types.ts";',
      ].map((code) => ({ code, filename: "src/accounts/index.ts", languageOptions: languageOpts })),
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
      ...[
        ["src/accounts/index.ts", "./__tests__/fixtures"],
        ["src/accounts/index.ts", "./components/stories/fixtures.ts"],
        ["src/accounts/index.ts", "./components/stories/fixtures.tsx"],
        ["src/accounts/index.ts", "./components/stories/fixtures/index.ts"],
        ["src/accounts/index.ts", "./components/stories/fixtures/helpers.ts"],
        ["src/accounts/__tests__/helpers.ts", "./fixtures"],
        ["src/accounts/__tests__/helpers.ts", "./fixtures/fixtures.ts"],
        ["src/accounts/__tests__/fixtures/helpers.ts", "./fixtures.ts"],
        ["src/accounts/__tests__/fixtures/nested/index.ts", "../fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.tsx", "./fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "../../stories/fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "../../../other/__tests__/fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "./nested/../../fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "../fixtures-other/fixtures.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "./helpers.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "./nested/index.ts"],
        ["src/accounts/__tests__/fixtures/index.ts", "./fixtures.ts/"],
        ["src/accounts/__tests__/fixtures/index.ts", "./missing/fixtures"],
        ["src/accounts/__tests__/fixtures/index.ts", "fixture-package"],
        ["src/accounts/__tests__/fixtures/index.ts", "."],
        ["src/accounts/__tests__/fixtures/index.ts", "./"],
        ["src/accounts/__tests__/fixtures/index.ts", "../fixtures"],
        ["C:\\work\\src\\accounts\\__tests__\\helpers.ts", "./fixtures/fixtures.ts"],
      ].flatMap(([filename, source]) =>
        [`export { fixture_rows } from "${source}";`, `export * from "${source}";`].map((code) => ({
          code,
          filename,
          languageOptions: languageOpts,
          errors: [{ messageId: "unexpectedFixtureExport" }],
          output: null,
        })),
      ),
      ...[
        'export { fixture_rows as rows } from "./fixtures.ts";',
        'export { fixture_rows as fixture_other } from "./fixtures.ts";',
        'export { rows as fixture_rows } from "./fixtures.ts";',
        'export { default as fixture_rows } from "./fixtures.ts";',
        'export { fixture_rows as default } from "./fixtures.ts";',
        'export { rows } from "./fixtures.ts";',
        'export * as fixture_rows from "./fixtures.ts";',
        'export * as rows from "./fixtures.ts";',
        'export type * from "./fixtures.ts";',
        'export type { fixture_rows } from "./fixtures.ts";',
        'export { type fixture_rows } from "./fixtures.ts";',
        "export const fixture_rows = [];",
        "const fixture_rows = []; export { fixture_rows };",
      ].map((code) => ({
        code,
        filename: "src/accounts/__tests__/fixtures/index.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedFixtureExport" }],
        output: null,
      })),
      ...[
        'export { default as rows } from "./stories/fixtures";',
        'export { rows } from "./stories/fixtures";',
        'export * as rows from "./stories/fixtures";',
        'export type * from "./stories/fixtures";',
      ].map((code) => ({
        code,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedFixtureExport" }],
        output: null,
      })),
      {
        code: `
          export const fixture_userAccountRows = [{ id: "1" }];
        `,
        filename: "src/accounts/buildRows.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedFixtureExport",
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
          },
        ],
        output: null,
      },
    ],
  },
);
