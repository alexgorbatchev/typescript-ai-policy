import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import hookFileNamingConventionRuleModule from "../hook-file-naming-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const EXPECTED_HOOK_FILE_NAMING_GUIDANCE =
  'Name hook files after the exported hook using the `use...` contract. Use "useThing.ts{,x}" by default, or "use-thing.ts{,x}" when the shared config uses `FilenameStyle.DashCase`. Do not use filenames that hide or contradict hook ownership.';

const EXPECTED_HOOK_FILE_NAMING_MESSAGES = {
  invalidHookFileName: "Rename this hook file to the configured {{expectedHookFilePattern}} form.",
  invalidHookExportName: "Rename this exported hook to the {{expectedHookExportPattern}} form.",
  mismatchedHookFileName:
    "Rename this file or exported hook so they match in the configured {{expectedHookFilePattern}} / {{expectedHookExportPattern}} form.",
};

it("uses the approved hook file naming guidance and messages", () => {
  expect(hookFileNamingConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_HOOK_FILE_NAMING_GUIDANCE);
  expect(hookFileNamingConventionRuleModule.meta.messages).toEqual(EXPECTED_HOOK_FILE_NAMING_MESSAGES);
});

ruleTester.run(
  "hook-file-naming-convention requires matching configured hook filenames and export names",
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
        filename: "src/accounts/hooks/useAccountPanel.ts",
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
      {
        code: `export function useAccountPanel() { return null; }`,
        filename: "src/accounts/hooks/use-account-panel.ts",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
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
              expectedHookExportPattern: "[use]PascalCase",
              expectedHookFilePattern: "useThing.ts{,x}",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useaccount.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHookFileName",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/use-account.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidHookFileName",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: { expectedHookFilePattern: "useThing.ts{,x}" },
          },
        ],
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
              expectedHookExportPattern: "[use]PascalCase",
              expectedHookFilePattern: "useThing.ts{,x}",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useBar() { return null; }`,
        filename: "src/accounts/hooks/use-foo.tsx",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
        errors: [
          {
            messageId: "mismatchedHookFileName",
            data: {
              expectedHookExportPattern: "[use]PascalCase",
              expectedHookFilePattern: "use-thing.ts{,x}",
            },
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
            messageId: "invalidHookFileName",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: { expectedHookFilePattern: "use-thing.ts{,x}" },
          },
        ],
        output: null,
      },
    ],
  },
);
