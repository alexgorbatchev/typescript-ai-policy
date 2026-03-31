import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import hooksDirectoryFileConventionRuleModule from "../hooks-directory-file-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "hooks-directory-file-convention restricts hooks directories to direct-child use files, support basenames, and sibling tests",
  hooksDirectoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/use-account.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export { useAccount } from './useAccount';`,
        filename: "src/accounts/hooks/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export type AccountHookState = { isReady: boolean };`,
        filename: "src/accounts/hooks/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `import { test } from 'bun:test'; test('works', () => {});`,
        filename: "src/accounts/hooks/__tests__/useAccount.test.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const utility = true;`,
        filename: "src/accounts/hooks/utils.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHooksDirectoryFile",
            data: {
              relativePath: "utils.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function accountHook() { return null; }`,
        filename: "src/accounts/hooks/accountHook.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHooksDirectoryFile",
            data: {
              relativePath: "accountHook.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const helper = true;`,
        filename: "src/accounts/hooks/helpers.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHooksDirectoryFile",
            data: {
              relativePath: "helpers.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const ACCOUNT_KIND = 'primary';`,
        filename: "src/accounts/hooks/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHooksDirectoryFile",
            data: {
              relativePath: "constants.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/internal/useAccount.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHooksDirectoryFile",
            data: {
              relativePath: "internal/useAccount.ts",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
