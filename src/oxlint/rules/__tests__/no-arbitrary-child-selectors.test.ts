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
      code: `export const classes = "bg-red-500 text-white [&[data-state=open]]:bg-white";`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `export const classes = <div className="bg-red-500 [&` + `amp;_div]:bg-blue-500" />;`,
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
      code: `export const classes = <div className="bg-red-500 [&` + `amp;>span]:text-xs" />;`,
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
      code: `export const classes = <div className={\`bg-red-500 [\${someVar}] [\\x26~p]:mt-2\`} />;`,
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
      code: `export const classes = <div className="bg-red-500 [&` + `amp;[data-active=true]_svg]:w-4" />;`,
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
      code: `export const classes = <div class="bg-red-500 [&` + `amp;_div]:bg-blue-500" />;`,
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
      code: `export const classes = <div className={cn("bg-red-500", "[\\x26_div]:bg-blue-500")} />;`,
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
    // Outside of JSX attributes - should report on Literal / TemplateElement directly
    {
      code: `export const classes = "bg-red-500 [\\x26_div]:bg-blue-500";`,
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
    {
      code: `export const classes = \`bg-red-500 [\${someVar}] [\\x26~p]:mt-2\`;`,
      filename: "src/components/Button.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "noArbitraryChildSelector",
          type: AST_NODE_TYPES.TemplateElement,
        },
      ],
      output: null,
    },
  ],
});
