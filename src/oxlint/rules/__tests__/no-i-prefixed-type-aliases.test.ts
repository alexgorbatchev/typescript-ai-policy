import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noIPrefixedTypeAliasesRuleModule from "../no-i-prefixed-type-aliases.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noIPrefixedTypeAliasesRuleTester = new RuleTester();

noIPrefixedTypeAliasesRuleTester.run(
  "no-i-prefixed-type-aliases bans interface-style I[A-Z] prefixes on type aliases",
  noIPrefixedTypeAliasesRuleModule,
  {
    valid: [
      {
        code: `
          type UserProfile = {
            id: string;
          };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type Id = string;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          interface IUserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type URLConfig = {
            href: string;
          };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          type IUserProfile = {
            id: string;
          };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeAliasName",
            data: {
              name: "IUserProfile",
              suggestedName: "UserProfile",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export type IURLConfig = {
            href: string;
          };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeAliasName",
            data: {
              name: "IURLConfig",
              suggestedName: "URLConfig",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
