import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import singleFixtureEntrypointRuleModule from "../single-fixture-entrypoint.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

type SupportDirectoryName = "__tests__" | "stories";

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "single-fixture-entrypoint-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createSupportDirectoryPath(name: string, directoryName: SupportDirectoryName): string {
  const directoryPath = join(tempRootDirectoryPath, name, directoryName);
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

const fixturesTsOnlyDirectoryPath = createSupportDirectoryPath("fixtures-ts-only", "__tests__");
writeFileSync(join(fixturesTsOnlyDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");

const fixturesTsxOnlyDirectoryPath = createSupportDirectoryPath("fixtures-tsx-only", "__tests__");
writeFileSync(join(fixturesTsxOnlyDirectoryPath, "fixtures.tsx"), "export const fixture_userAccountRows = <div />;\n");

const fixturesDirectoryOnlyPath = createSupportDirectoryPath("fixtures-directory-only", "__tests__");
mkdirSync(join(fixturesDirectoryOnlyPath, "fixtures"), { recursive: true });
writeFileSync(join(fixturesDirectoryOnlyPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const storyFixturesTsOnlyDirectoryPath = createSupportDirectoryPath("story-fixtures-ts-only", "stories");
writeFileSync(join(storyFixturesTsOnlyDirectoryPath, "fixtures.ts"), "export const fixture_storyRows = [];\n");

const fixturesTsAndTsxDirectoryPath = createSupportDirectoryPath("fixtures-ts-and-tsx", "__tests__");
writeFileSync(join(fixturesTsAndTsxDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");
writeFileSync(join(fixturesTsAndTsxDirectoryPath, "fixtures.tsx"), "export const fixture_userAccountRows = <div />;\n");

const fixturesTsAndDirectoryPath = createSupportDirectoryPath("fixtures-ts-and-directory", "__tests__");
writeFileSync(join(fixturesTsAndDirectoryPath, "fixtures.ts"), "export const fixture_userAccountRows = [];\n");
mkdirSync(join(fixturesTsAndDirectoryPath, "fixtures"), { recursive: true });
writeFileSync(join(fixturesTsAndDirectoryPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const storyFixturesTsxAndDirectoryPath = createSupportDirectoryPath("story-fixtures-tsx-and-directory", "stories");
writeFileSync(join(storyFixturesTsxAndDirectoryPath, "fixtures.tsx"), "export const fixture_storyRows = <div />;\n");
mkdirSync(join(storyFixturesTsxAndDirectoryPath, "fixtures"), { recursive: true });
writeFileSync(join(storyFixturesTsxAndDirectoryPath, "fixtures", "rows.ts"), "export const rows = [];\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "single-fixture-entrypoint allows only one fixture entrypoint shape per support directory",
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
      {
        code: `export const fixture_storyRows = [];`,
        filename: join(storyFixturesTsOnlyDirectoryPath, "fixtures.ts"),
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
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: {
              directoryLabel: "__tests__",
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
              directoryLabel: "__tests__",
              entries: "fixtures.ts, fixtures/",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const fixture_storyRows = <div />;`,
        filename: join(storyFixturesTsxAndDirectoryPath, "fixtures.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "conflictingFixtureEntrypoints",
            data: {
              directoryLabel: "stories",
              entries: "fixtures.tsx, fixtures/",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
