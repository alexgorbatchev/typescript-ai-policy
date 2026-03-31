import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noTestFileExportsRuleModule from "../no-test-file-exports.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noTestFileExportsRuleTester = new RuleTester();

noTestFileExportsRuleTester.run("no-test-file-exports bans exports from test files", noTestFileExportsRuleModule, {
  valid: [
    {
      code: `
        import { test } from 'bun:test';

        test('renders', () => {});
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
    },
    {
      code: `
        export const renderSignalPanel = () => null;
      `,
      filename: "src/widgets/__tests__/helpers.ts",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `
        export const FIXTURE_SIGNAL_PANEL = { isReady: true };
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTestExport",
        },
      ],
      output: null,
    },
    {
      code: `
        export default function SignalPanelTest() {
          return null;
        }
      `,
      filename: "src/widgets/SignalPanel.test.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTestExport",
        },
      ],
      output: null,
    },
    {
      code: `
        export * from './helpers';
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTestExport",
        },
      ],
      output: null,
    },
    {
      code: `
        export type SignalPanelState = 'idle' | 'busy';
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTestExport",
        },
      ],
      output: null,
    },
    {
      code: `
        const renderSignalPanel = () => null;
        export = renderSignalPanel;
      `,
      filename: "src/widgets/__tests__/SignalPanel.test.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedTestExport",
        },
      ],
      output: null,
    },
  ],
});
