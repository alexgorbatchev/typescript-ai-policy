import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import testsDirectoryFileConventionRuleModule from "../tests-directory-file-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const testsDirectoryFileConventionRuleTester = new RuleTester();
const EXPECTED_TESTS_DIRECTORY_FILE_GUIDANCE =
  'Keep "__tests__/" limited to "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move runtime files and other support roles out of the test tree.';

it("uses the approved tests directory guidance", () => {
  expect(testsDirectoryFileConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_TESTS_DIRECTORY_FILE_GUIDANCE);
});

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
            type: AST_NODE_TYPES.ExportNamedDeclaration,
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
          },
        ],
        output: null,
      },
    ],
  },
);
