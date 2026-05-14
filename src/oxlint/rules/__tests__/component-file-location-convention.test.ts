import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import componentFileLocationConventionRuleModule from "../component-file-location-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();
const EXPECTED_COMPONENT_FILE_LOCATION_GUIDANCE =
  'Keep non-hook, non-test ".tsx" ownership files under "components/", "templates/", or "layouts/". Move files for other roles to their canonical locations.';
const EXPECTED_COMPONENT_FILE_LOCATION_MESSAGE =
  'Place non-hook, non-test ".tsx" ownership files under "components/", "templates/", or "layouts/".';

it("uses the approved component ownership repair message", () => {
  expect(componentFileLocationConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_COMPONENT_FILE_LOCATION_GUIDANCE);
  expect(componentFileLocationConventionRuleModule.meta.messages?.unexpectedComponentFileLocation).toBe(
    EXPECTED_COMPONENT_FILE_LOCATION_MESSAGE,
  );
});

ruleTester.run(
  "component-file-location-convention requires non-hook, non-test tsx files to live in component areas",
  componentFileLocationConventionRuleModule,
  {
    valid: [
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/accounts/components/AccountPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountEmail() { return <section />; }`,
        filename: "src/accounts/templates/AccountEmail.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: "src/accounts/hooks/useAccount.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const helper = <div />;`,
        filename: "src/accounts/hooks/helpers.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `import { test } from 'bun:test'; test('renders', () => {});`,
        filename: "src/accounts/components/__tests__/AccountPanel.test.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/accounts/AccountPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedComponentFileLocation",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
          },
        ],
        output: null,
      },
      {
        code: `export const helper = <div />;`,
        filename: "src/lib/helpers.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedComponentFileLocation" }],
        output: null,
      },
      {
        code: `export function Welcome() { return <section />; }`,
        filename: "src/email/Welcome.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedComponentFileLocation" }],
        output: null,
      },
    ],
  },
);
