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
  "Name component ownership files after the component they export. Keep non-component file roles out of the component ownership surface.";

const EXPECTED_COMPONENT_FILE_NAMING_MESSAGES = {
  invalidComponentExportName:
    "Rename this exported component to PascalCase. Component ownership exports must use PascalCase names.",
  invalidComponentFileName:
    "Rename this file so its basename maps deterministically to the exported component name. Keep non-component file roles out of the component ownership surface.",
  mismatchedComponentFileName:
    "Rename this file or the exported component so they match exactly. Use the PascalCase or kebab-case form of the component name.",
};

it("uses the approved component file naming guidance and messages", () => {
  expect(componentFileNamingConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_COMPONENT_FILE_NAMING_GUIDANCE);
  expect(componentFileNamingConventionRuleModule.meta.messages).toEqual(EXPECTED_COMPONENT_FILE_NAMING_MESSAGES);
});

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
            data: {},
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
            data: {},
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
            type: AST_NODE_TYPES.Identifier,
            data: {},
          },
        ],
        output: null,
      },
    ],
  },
);
