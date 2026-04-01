import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import componentDirectoryFileConventionRuleModule from "../component-directory-file-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "component-directory-file-convention restricts component area contents to direct-child ownership files, support basenames, and sibling stories",
  componentDirectoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/accounts/components/AccountPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export { AccountPanel } from './AccountPanel';`,
        filename: "src/accounts/components/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export type AccountPanelProps = { isReady: boolean };`,
        filename: "src/accounts/components/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const ACCOUNT_PANEL_KIND = 'primary';`,
        filename: "src/accounts/components/constants.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export default {};`,
        filename: "src/accounts/components/stories/AccountPanel.stories.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/accounts/components/stories/helpers.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_accountPanel = {};`,
        filename: "src/accounts/components/stories/fixtures.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const accountPanel = true;`,
        filename: "src/accounts/components/AccountPanel.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "AccountPanel.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const utility = true;`,
        filename: "src/accounts/components/utils.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "utils.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const helper = <div />;`,
        filename: "src/accounts/components/helpers.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "helpers.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: "src/accounts/components/internal/AccountPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "internal/AccountPanel.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export function Welcome() { return <section />; }`,
        filename: "src/accounts/templates/email/Welcome.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "templates",
              relativePath: "email/Welcome.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `import { test } from 'bun:test'; test('renders', () => {});`,
        filename: "src/accounts/components/__tests__/AccountPanel.test.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "__tests__/AccountPanel.test.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/accounts/components/__tests__/helpers.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "__tests__/helpers.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `export const fixture_accountPanel = {};`,
        filename: "src/accounts/components/__tests__/fixtures.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidComponentDirectoryFile",
            data: {
              directoryName: "components",
              relativePath: "__tests__/fixtures.ts",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
