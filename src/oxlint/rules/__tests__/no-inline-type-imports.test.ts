import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../no-inline-type-imports.ts";

const ruleTester = new RuleTester();

ruleTester.run("no-inline-type-imports", rule, {
  valid: [
    {
      code: `
        import type { PluginOption } from "vite";
        const a: PluginOption = {};
      `,
    },
    {
      code: `
        type ViteModule = typeof import("vite");
      `,
    },
    {
      code: `
        type VitePluginOption = typeof import("vite").PluginOption;
      `,
    },
    {
      code: `
        type NestedModule = typeof import("vite").nested.PluginOption;
      `,
    },
    {
      code: `
        /** @type {import("vite").PluginOption} */
        const a = {};
      `,
    },
  ],
  invalid: [
    {
      code: `
        const a = x as import("vite").PluginOption;
      `,
      errors: [
        {
          messageId: "noInlineTypeImport",
          data: { importPath: "vite" },
        },
      ],
    },
    {
      code: `
        type A = import("vite");
      `,
      errors: [
        {
          messageId: "noInlineTypeImport",
          data: { importPath: "vite" },
        },
      ],
    },
    {
      code: `
        function foo(bar: import("vite").PluginOption) {}
      `,
      errors: [
        {
          messageId: "noInlineTypeImport",
          data: { importPath: "vite" },
        },
      ],
    },
    {
      code: `
        type A<T = import("vite").PluginOption> = T;
      `,
      errors: [
        {
          messageId: "noInlineTypeImport",
          data: { importPath: "vite" },
        },
      ],
    },
  ],
});
