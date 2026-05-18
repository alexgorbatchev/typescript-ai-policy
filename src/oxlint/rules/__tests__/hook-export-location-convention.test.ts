import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import hookExportLocationConventionRuleModule from "../hook-export-location-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "hook-export-location-convention requires exported use* runtime bindings to live in direct-child configured hooks ownership files",
  hookExportLocationConventionRuleModule,
  {
    valid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccountPanel.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export { useAccount } from './accounts/hooks/useAccount';`,
        filename: "src/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export type UseAccountConfig = { isReady: boolean };`,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/use-account.ts",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
      },
    ],
    invalid: [
      {
        code: `export function useAccount() {
  return null;
}`,
        filename: "src/accounts/useAccount.ts",
        languageOptions: languageOpts,
        errors: [
          {
            column: 8,
            endColumn: 31,
            endLine: 1,
            line: 1,
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `export const useAccount = () => null;`,
        filename: "src/accounts/components/useAccount.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
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
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccountHelper() { return null; }`,
        filename: "src/accounts/hooks/helpers.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccountConfig() { return null; }`,
        filename: "src/accounts/hooks/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
        errors: [
          {
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "use-thing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `
          const useAccount = () => null;
          export { useAccount };
        `,
        filename: "src/accounts/lib/account.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "misplacedHookExport",
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
    ],
  },
);
