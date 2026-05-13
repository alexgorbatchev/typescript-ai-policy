import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import noClassNameStylePropsOutsideComponentGlobsRuleModule from "../no-classname-style-props-outside-component-globs.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "no-classname-style-props-outside-component-globs blocks className and style props outside canonical component areas",
  noClassNameStylePropsOutsideComponentGlobsRuleModule,
  {
    valid: [
      {
        code: `
          export function Button() {
            return <div className="button" style={{ color: "red" }} />;
          }
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function Button() {
            return <Button className="page-shell" style={{ color: "red" }} />;
          }
        `,
        filename: "src/email/templates/marketing/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const meta = {
            decorators: [(Story: () => JSX.Element) => <Button className="frame"><Story /></Button>],
          };
        `,
        filename: "src/app/stories/AppShell.stories.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function renderHarness() {
            return <Button className="frame" style={{ color: "red" }} />;
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
          export function DashboardRoute() {
            return <Button className="page-shell" />;
          }
        `,
        filename: "src/routes/DashboardRoute.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noClassNameOrStylePropOutsideComponentDirectory",
            type: AST_NODE_TYPES.JSXIdentifier,
          },
        ],
        output: null,
      },
      {
        code: `
          export function DashboardRoute() {
            return <Button style={{ color: "red" }} />;
          }
        `,
        filename: "src/routes/DashboardRoute.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noClassNameOrStylePropOutsideComponentDirectory",
            type: AST_NODE_TYPES.JSXIdentifier,
          },
        ],
        output: null,
      },
      {
        code: `
          export function Main() {
            return <Button className="page-shell" />;
          }
        `,
        filename: "src/main.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noClassNameOrStylePropOutsideComponentDirectory",
            type: AST_NODE_TYPES.JSXIdentifier,
          },
        ],
        output: null,
      },
    ],
  },
);
