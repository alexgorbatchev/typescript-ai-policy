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
  "hook-export-location-convention requires exported use* runtime bindings to live in direct-child hooks ownership files",
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
        filename: "src/accounts/hooks/use-account.ts",
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
    ],
    invalid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/useAccount.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "misplacedHookExport",
            data: {
              hookName: "useAccount",
              camelFilename: "useAccount.ts",
              kebabFilename: "use-account.ts",
            },
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
            data: {
              hookName: "useAccount",
              camelFilename: "useAccount.tsx",
              kebabFilename: "use-account.tsx",
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
            messageId: "misplacedHookExport",
            data: {
              hookName: "useAccount",
              camelFilename: "useAccount.ts",
              kebabFilename: "use-account.ts",
            },
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
            data: {
              hookName: "useAccountHelper",
              camelFilename: "useAccountHelper.ts",
              kebabFilename: "use-account-helper.ts",
            },
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
            data: {
              hookName: "useAccountConfig",
              camelFilename: "useAccountConfig.ts",
              kebabFilename: "use-account-config.ts",
            },
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
            data: {
              hookName: "useAccount",
              camelFilename: "useAccount.ts",
              kebabFilename: "use-account.ts",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
