import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import singleFixtureEntrypointRuleModule from "../single-fixture-entrypoint.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "single-fixture-entrypoint-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createTestsDirectoryPath(name: string): string {
  const directoryPath = join(tempRootDirectoryPath, name, "__tests__");
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

const fixturesTsOnlyDirectoryPath = createTestsDirectoryPath("fixtures-ts-only");
writeFileSync(join(fixturesTsOnlyDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");

const fixturesTsxOnlyDirectoryPath = createTestsDirectoryPath("fixtures-tsx-only");
writeFileSync(join(fixturesTsxOnlyDirectoryPath, "fixtures.tsx"), "export const fixture_userAccountRows = <div />;\n");

const fixturesDirectoryOnlyPath = createTestsDirectoryPath("fixtures-directory-only");
mkdirSync(join(fixturesDirectoryOnlyPath, "fixtures"), { recursive: true });
writeFileSync(join(fixturesDirectoryOnlyPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const fixturesTsAndTsxDirectoryPath = createTestsDirectoryPath("fixtures-ts-and-tsx");
writeFileSync(join(fixturesTsAndTsxDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");
writeFileSync(join(fixturesTsAndTsxDirectoryPath, "fixtures.tsx"), "export const fixture_userAccountRows = <div />;\n");

const fixturesTsAndDirectoryPath = createTestsDirectoryPath("fixtures-ts-and-directory");
writeFileSync(join(fixturesTsAndDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");
mkdirSync(join(fixturesTsAndDirectoryPath, "fixtures"), { recursive: true });
writeFileSync(join(fixturesTsAndDirectoryPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const fixturesTsxAndDirectoryPath = createTestsDirectoryPath("fixtures-tsx-and-directory");
writeFileSync(join(fixturesTsxAndDirectoryPath, "fixtures.tsx"), "export const fixture_userAccountRows = <div />;\n");
mkdirSync(join(fixturesTsxAndDirectoryPath, "fixtures"), { recursive: true });
writeFileSync(join(fixturesTsxAndDirectoryPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "single-fixture-entrypoint allows only one fixture entrypoint shape per __tests__ directory",
  singleFixtureEntrypointRuleModule,
  {
    valid: [
      {
        code: `export const fixture_userAccountRows = [];`,
        filename: join(fixturesTsOnlyDirectoryPath, "fixtures.ts"),
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_userAccountRows = <div />;`,
        filename: join(fixturesTsxOnlyDirectoryPath, "fixtures.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export const rows = [];`,
        filename: join(fixturesDirectoryOnlyPath, "fixtures", "rows.ts"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const fixture_userAccountRows = [];`,
        filename: join(fixturesTsAndTsxDirectoryPath, "fixtures.ts"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "conflictingFixtureEntrypoints",
            data: {
              entries: "fixtures.ts, fixtures.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const fixture_userAccountRows = [];`,
        filename: join(fixturesTsAndDirectoryPath, "fixtures.ts"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "conflictingFixtureEntrypoints",
            data: {
              entries: "fixtures.ts, fixtures/",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const fixture_userAccountRows = <div />;`,
        filename: join(fixturesTsxAndDirectoryPath, "fixtures.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "conflictingFixtureEntrypoints",
            data: {
              entries: "fixtures.tsx, fixtures/",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
