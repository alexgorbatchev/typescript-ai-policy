import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import componentFileNamingConventionRuleModule from "../component-file-naming-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "component-file-naming-convention requires PascalCase exports and matching PascalCase or kebab-case filenames",
  componentFileNamingConventionRuleModule,
  {
    valid: [
      {
        code: `export function Button() { return <button />; }`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/ui/components/account-panel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const Button = memo(function Button() { return <button />; });`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export function button() { return <button />; }`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [
          { messageId: "invalidComponentExportName" },
          {
            messageId: "mismatchedComponentFileName",
            data: {
              exportedName: "button",
              pascalFilename: "button.tsx",
              kebabFilename: "button.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/ui/components/accountPanel.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidComponentFileName" }],
        output: null,
      },
      {
        code: `export function AccountCard() { return <section />; }`,
        filename: "src/ui/components/AccountPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "mismatchedComponentFileName",
            data: {
              exportedName: "AccountCard",
              pascalFilename: "AccountCard.tsx",
              kebabFilename: "account-card.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountCard() { return <section />; }`,
        filename: "src/ui/components/account-panel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "mismatchedComponentFileName",
            data: {
              exportedName: "AccountCard",
              pascalFilename: "AccountCard.tsx",
              kebabFilename: "account-card.tsx",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
