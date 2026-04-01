import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noLocalTypeDeclarationsInFixtureFilesRuleModule from "../no-local-type-declarations-in-fixture-files.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noLocalTypeDeclarationsInFixtureFilesRuleTester = new RuleTester();

noLocalTypeDeclarationsInFixtureFilesRuleTester.run(
  "no-local-type-declarations-in-fixture-files bans local types, interfaces, and enums in fixture files",
  noLocalTypeDeclarationsInFixtureFilesRuleModule,
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
          export const buildRows = () => [];
        `,
        filename: "src/accounts/__tests__/fixtures/buildRows.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const buildRows = () => [];
        `,
        filename: "src/accounts/components/stories/fixtures/buildRows.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type UserRow = { id: string };
          export const buildRows = () => [];
        `,
        filename: "src/accounts/__tests__/helpers.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          type UserRow = { id: string };
          export const fixture_userAccountRows = [];
        `,
        filename: "src/accounts/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeAliasDeclaration",
          },
        ],
        output: null,
      },
      {
        code: `
          interface IUserRow {
            id: string;
          }

          export const fixture_userAccountRows = [];
        `,
        filename: "src/accounts/__tests__/fixtures.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInterfaceDeclaration",
          },
        ],
        output: null,
      },
      {
        code: `
          enum UserKind {
            Admin = "admin",
          }

          export const rows = [];
        `,
        filename: "src/accounts/__tests__/fixtures/userKinds.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedEnumDeclaration",
          },
        ],
        output: null,
      },
      {
        code: `
          type StoryRow = { id: string };
          export const fixture_storyRows = [];
        `,
        filename: "src/accounts/components/stories/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeAliasDeclaration",
          },
        ],
        output: null,
      },
    ],
  },
);
