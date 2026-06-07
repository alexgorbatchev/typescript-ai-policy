import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import noArbitraryChildSelectorsRuleModule from "../no-arbitrary-child-selectors.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("no-arbitrary-child-selectors", noArbitraryChildSelectorsRuleModule, {
  valid: [
    {
      code: `
          export function Panel() {
            return (
              <div className="z-[var(--devhost-z-floating-panel)]">
                <Card />
              </div>
            );
          }
        `,
      filename: "src/components/Panel.tsx",
      languageOptions: languageOpts,
    },
    {
      code: `
          export function Container() {
            return (
              <div className="[&_svg]:size-4">
                <svg />
                <span>Text</span>
              </div>
            );
          }
        `,
      filename: "src/components/Container.tsx",
      languageOptions: languageOpts,
    },
    {
      code: `export const classes = <div className="bg-red-500 text-white [&amp;[data-state=open]]:bg-white" />;`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
    },
    {
      code: `export const classes = <div className={\`bg-red-500 \${someVar} text-white\`} />;`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
    },
    {
      code: `export const classes = <div className="bg-red-500 [&amp;[data-active=true]_svg]:w-4" />;`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    // 1. Direct custom component targeting by name (Banned everywhere)
    {
      code: `export const classes = <div className="bg-red-500 [&` + `amp;_Button]:bg-blue-500" />;`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelector",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
    {
      code: `export const classes = "bg-red-500 [\\x26_\\x42utton]:bg-blue-500";`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelector",
          type: AST_NODE_TYPES.Literal,
        },
      ],
      output: null,
    },
    // 2. Intrinsic selectors styling custom component descendants (Banned when wrapping a component)
    {
      code: `
          export function Container() {
            return (
              <div className="bg-red-500 [&_svg]:size-4">
                <Button />
              </div>
            );
          }
        `,
      filename: "src/components/Container.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelectorOnCustomComponent",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
    {
      code: `
          export function Container() {
            return (
              <div className="bg-red-500 [&_a]:underline">
                <Button />
              </div>
            );
          }
        `,
      filename: "src/components/Container.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelectorOnCustomComponent",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
    {
      code: `
          export function Container() {
            return (
              <div className="bg-red-500 [&_svg]:size-4">
                <Button />
                <Button />
              </div>
            );
          }
        `,
      filename: "src/components/Container.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelectorOnCustomComponent",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
    // 3. Custom CSS variables declarations/overrides on wrapping elements (Banned when wrapping a component)
    {
      code: `
          export function Panel() {
            return (
              <div className="[--card-padding:0]">
                <Card />
              </div>
            );
          }
        `,
      filename: "src/components/Panel.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelectorOnCustomComponent",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
    {
      code: `
          export function Panel() {
            return (
              <div style={{ "--card-padding": "0px" }}>
                <Card />
              </div>
            );
          }
        `,
      filename: "src/components/Panel.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelectorOnCustomComponent",
          type: AST_NODE_TYPES.JSXIdentifier,
        },
      ],
      output: null,
    },
  ],
});
