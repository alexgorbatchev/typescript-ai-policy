import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import noIntrinsicElementsOutsideComponentGlobsRuleModule from "../no-intrinsic-elements-outside-component-globs.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();
const EXPECTED_NO_INTRINSIC_ELEMENTS_OUTSIDE_COMPONENT_GLOBS_MESSAGE =
  'Raw DOM markup only allowed inside component ownership files in "components/", "templates/", or "layouts/".';

it("uses the approved intrinsic JSX repair message", () => {
  expect(
    noIntrinsicElementsOutsideComponentGlobsRuleModule.meta.messages?.noIntrinsicElementOutsideComponentDirectory,
  ).toBe(EXPECTED_NO_INTRINSIC_ELEMENTS_OUTSIDE_COMPONENT_GLOBS_MESSAGE);
});

ruleTester.run(
  "no-intrinsic-elements-outside-component-globs blocks intrinsic JSX outside canonical component areas",
  noIntrinsicElementsOutsideComponentGlobsRuleModule,
  {
    valid: [
      {
        code: `
          export function Button() {
            return <div />;
          }
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function Layout() {
            return <div />;
          }
        `,
        filename: "src/email/templates/marketing/Layout.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const meta = {
            decorators: [(Story: () => JSX.Element) => <div><Story /></div>],
          };
        `,
        filename: "src/app/stories/AppShell.stories.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function renderHarness() {
            return <div />;
          }
        `,
        filename: "src/app/__tests__/AppShell.test.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function WelcomeEmail() {
            return <Layout><Button /></Layout>;
          }
        `,
        filename: "src/routes/WelcomeEmail.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export function AppShell() {
            return <div />;
          }
        `,
        filename: "src/app/AppShell.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noIntrinsicElementOutsideComponentDirectory",
            type: AST_NODE_TYPES.JSXIdentifier,
          },
        ],
        output: null,
      },
      {
        code: `
          export function Main() {
            return <div />;
          }
        `,
        filename: "src/main.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noIntrinsicElementOutsideComponentDirectory",
            type: AST_NODE_TYPES.JSXIdentifier,
          },
        ],
        output: null,
      },
    ],
  },
);
