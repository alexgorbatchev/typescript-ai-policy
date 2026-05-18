import { afterAll, describe, expect, it } from "bun:test";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import componentFileNamingConventionRuleModule from "../component-file-naming-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const EXPECTED_COMPONENT_FILE_NAMING_GUIDANCE =
  'Name each component ownership file after its exported PascalCase component. Use "ComponentName.tsx" by default, or "component-name.tsx" when the shared config uses `FilenameStyle.DashCase`. For multipart component families, use the shared family root name.';

const EXPECTED_COMPONENT_FILE_NAMING_MESSAGES = {
  invalidComponentExportName: "Rename this exported component to PascalCase.",
  invalidComponentFileName:
    "Rename this file to the configured {{expectedComponentFilePattern}} basename that matches the exported component name.",
  mismatchedComponentFileName:
    "Rename this file or exported component so they match in the configured {{expectedComponentFilePattern}} form.",
};

it("uses the approved component file naming guidance and messages", () => {
  expect(componentFileNamingConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_COMPONENT_FILE_NAMING_GUIDANCE);
  expect(componentFileNamingConventionRuleModule.meta.messages).toEqual(EXPECTED_COMPONENT_FILE_NAMING_MESSAGES);
});

ruleTester.run(
  "component-file-naming-convention requires PascalCase exports and matching configured filenames",
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
        filename: "src/ui/components/AccountPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const Button = memo(function Button() { return <button />; });`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function SelectTrigger() {
            return <button />;
          }

          export function Select() {
            return <button />;
          }
        `,
        filename: "src/ui/components/Select.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/ui/components/account-panel.tsx",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
      },
      {
        code: `
          export function SelectTrigger() {
            return <button />;
          }

          export function Select() {
            return <button />;
          }
        `,
        filename: "src/ui/components/select.tsx",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
      },
    ],
    invalid: [
      {
        code: `export function button() { return <button />; }`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentExportName",
            type: AST_NODE_TYPES.Identifier,
          },
          {
            messageId: "mismatchedComponentFileName",
            type: AST_NODE_TYPES.Identifier,
            data: { expectedComponentFilePattern: "ComponentName.tsx" },
          },
        ],
        output: null,
      },
      {
        code: `
          import { render } from "preact";

          export function AccountPanel() {
            return <section />;
          }
        `,
        filename: "src/ui/components/accountPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentFileName",
            type: AST_NODE_TYPES.ImportDeclaration,
            data: { expectedComponentFilePattern: "ComponentName.tsx" },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountCard() { return <section />; }`,
        filename: "src/ui/components/AccountPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "mismatchedComponentFileName",
            type: AST_NODE_TYPES.Identifier,
            data: { expectedComponentFilePattern: "ComponentName.tsx" },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/ui/components/account-panel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentFileName",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: { expectedComponentFilePattern: "ComponentName.tsx" },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/ui/components/AccountPanel.tsx",
        languageOptions: languageOpts,
        options: [{ filenameStyle: "dash-case" }],
        errors: [
          {
            messageId: "invalidComponentFileName",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
            data: { expectedComponentFilePattern: "component-name.tsx" },
          },
        ],
        output: null,
      },
    ],
  },
);
