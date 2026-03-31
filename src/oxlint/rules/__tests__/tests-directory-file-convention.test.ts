import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import testsDirectoryFileConventionRuleModule from "../tests-directory-file-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const testsDirectoryFileConventionRuleTester = new RuleTester();

testsDirectoryFileConventionRuleTester.run(
  "tests-directory-file-convention restricts __tests__ contents",
  testsDirectoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `import { test } from 'bun:test'; test('renders', () => {});`,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { SignalPanelFixture } from "../SignalPanelFixture";

          export const fixture_signalPanel = {} satisfies SignalPanelFixture;
        `,
        filename: "src/widgets/__tests__/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/__tests__/helpers.tsx",
        languageOptions: languageOpts,
      },
      {
        code: "",
        filename: "src/widgets/__tests__/fixtures/snapshots/SignalPanel.json",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const setup = true;`,
        filename: "src/widgets/__tests__/setup.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestsDirectoryFile",
            data: {
              relativePath: "setup.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/__tests__/helpers.js",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestsDirectoryFile",
            data: {
              relativePath: "helpers.js",
            },
          },
        ],
        output: null,
      },
      {
        code: `import { test } from 'bun:test'; test('renders', () => {});`,
        filename: "src/widgets/__tests__/subdir/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestsDirectoryFile",
            data: {
              relativePath: "subdir/SignalPanel.test.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: "",
        filename: "src/widgets/__tests__/AGENTS.md",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestsDirectoryFile",
            data: {
              relativePath: "AGENTS.md",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
