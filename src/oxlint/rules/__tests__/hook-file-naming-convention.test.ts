import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import hookFileNamingConventionRuleModule from "../hook-file-naming-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "hook-file-naming-convention requires matching useFoo or use-foo filenames and export names",
  hookFileNamingConventionRuleModule,
  {
    valid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccountPanel() { return null; }`,
        filename: "src/accounts/hooks/use-account-panel.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return <div />; }`,
        filename: "src/accounts/hooks/useAccount.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function useWrongName() { return null; }`,
        filename: "src/accounts/hooks/__tests__/useAccount.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export function useWrongName() { return null; }`,
        filename: "src/accounts/hooks/stories/useAccount.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export function UseAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHookExportName",
            type: AST_NODE_TYPES.Identifier,
          },
          {
            messageId: "mismatchedHookFileName",
            type: AST_NODE_TYPES.Identifier,
            data: {
              exportedName: "UseAccount",
              camelFilename: "UseAccount.ts",
              kebabFilename: "use-account.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useaccount.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidHookFileName", type: AST_NODE_TYPES.ExportNamedDeclaration }],
        output: null,
      },
      {
        code: `export function useBar() { return null; }`,
        filename: "src/accounts/hooks/useFoo.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "mismatchedHookFileName",
            data: {
              exportedName: "useBar",
              camelFilename: "useBar.ts",
              kebabFilename: "use-bar.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useBar() { return null; }`,
        filename: "src/accounts/hooks/use-foo.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "mismatchedHookFileName",
            data: {
              exportedName: "useBar",
              camelFilename: "useBar.tsx",
              kebabFilename: "use-bar.tsx",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
