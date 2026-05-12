import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import noIntrinsicElementsOutsideComponentGlobsRuleModule from "../no-intrinsic-elements-outside-component-globs.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const settings = {
  "@alexgorbatchev": {
    componentGlobs: ["src/ui/components/**/*", "src/email/templates/**/*", "src/main.tsx"],
  },
};

ruleTester.run(
  "no-intrinsic-elements-outside-component-globs blocks intrinsic JSX outside configured component globs",
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
        settings,
      },
      {
        code: `
          export function Main() {
            return <div />;
          }
        `,
        filename: "src/main.tsx",
        languageOptions: languageOpts,
        settings,
      },
      {
        code: `
          export const meta = {
            decorators: [(Story: () => JSX.Element) => <div><Story /></div>],
          };
        `,
        filename: "src/app/stories/AppShell.stories.tsx",
        languageOptions: languageOpts,
        settings,
      },
      {
        code: `
          export function renderHarness() {
            return <div />;
          }
        `,
        filename: "src/app/__tests__/AppShell.test.tsx",
        languageOptions: languageOpts,
        settings,
      },
      {
        code: `
          export function WelcomeEmail() {
            return <Layout><Button /></Layout>;
          }
        `,
        filename: "src/routes/WelcomeEmail.tsx",
        languageOptions: languageOpts,
        settings,
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
        settings,
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
