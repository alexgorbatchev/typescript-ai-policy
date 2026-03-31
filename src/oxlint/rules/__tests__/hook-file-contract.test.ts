import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import hookFileContractRuleModule from "../hook-file-contract.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "hook-file-contract enforces one direct named runtime hook export per ownership file",
  hookFileContractRuleModule,
  {
    valid: [
      {
        code: `
          export interface IUseAccountResult { isReady: boolean; }

          function normalizeValue(value: string) {
            return value.trim();
          }

          export function useAccount() {
            return normalizeValue(' ready ');
          }
        `,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const useAccount = () => null;`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainHookExport" }],
        output: null,
      },
      {
        code: `
          const useAccount = () => null;
          export { useAccount };
        `,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainHookExport" }],
        output: null,
      },
      {
        code: `export default function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainHookExport" }],
        output: null,
      },
      {
        code: `
          export function useAccount() {
            return null;
          }

          export const ACCOUNT_KIND = 'primary';
        `,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedAdditionalRuntimeExport" }],
        output: null,
      },
      {
        code: `export type UseAccountResult = { isReady: boolean };`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "missingMainHookExport" }],
        output: null,
      },
      {
        code: `export const useAccount = trace(function useAccount() { return null; });`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainHookExport" }],
        output: null,
      },
    ],
  },
);
