import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import ruleModule from "../no-trivial-forwarding-function.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("no-trivial-forwarding-function", ruleModule, {
  valid: [
    {
      code: `
        export function readComponentEditor(value: string): string {
          return value.trim();
        }
      `,
      filename: "readComponentEditor.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        export function readComponentEditor(config: { componentEditor: string }): string {
          if (config.componentEditor === "") {
            return "fallback";
          }

          return config.componentEditor;
        }
      `,
      filename: "readComponentEditor.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        export function readComponentEditor({ componentEditor }: { componentEditor: string }): string {
          return readInjectedDevtoolsConfig(componentEditor);
        }
      `,
      filename: "readComponentEditor.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        export const api = {
          readComponentEditor(): string {
            return readInjectedDevtoolsConfig().componentEditor;
          },
        };
      `,
      filename: "readComponentEditor.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        function readIndentSize(line: string): number {
          return readIndent(line).length;
        }
      `,
      filename: "readIndentSize.ts",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `
        export function readDevtoolsComponentEditor(): DevtoolsComponentEditor {
          return readInjectedDevtoolsConfig().componentEditor;
        }
      `,
      filename: "readDevtoolsComponentEditor.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTrivialForwardingFunction",
        },
      ],
      output: null,
    },
    {
      code: `
        function readUserName(userId: string): string {
          return fetchUser(userId).name;
        }
      `,
      filename: "readUserName.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTrivialForwardingFunction",
        },
      ],
      output: null,
    },
    {
      code: `
        export const readUserName = (userId: string): string => fetchUser(userId).name;
      `,
      filename: "readUserName.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTrivialForwardingFunction",
        },
      ],
      output: null,
    },
  ],
});
