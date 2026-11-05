import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storiesDirectoryFileConventionRuleModule from "../stories-directory-file-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const storiesDirectoryFileConventionRuleTester = new RuleTester();

storiesDirectoryFileConventionRuleTester.run(
  "stories-directory-file-convention restricts stories contents",
  storiesDirectoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `export default {};`,
        filename: "src/widgets/components/stories/SignalPanel.stories.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/components/stories/helpers.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_signalPanel = {};`,
        filename: "src/widgets/components/stories/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: "",
        filename: "src/widgets/components/stories/fixtures/snapshots/SignalPanel.json",
        languageOptions: languageOpts,
      },
      {
        code: `export default {};`,
        filename: "src/widgets/components/stories/catalog/forms/SignalPanel.stories.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/components/stories/catalog/helpers.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/components/stories/catalog/forms/helpers.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_signalPanel = {};`,
        filename: "src/widgets/components/stories/catalog/fixtures.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_signalPanel = {};`,
        filename: "src/widgets/components/stories/catalog/forms/fixtures.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_signalPanel = {};`,
        filename: "src/widgets/components/stories/catalog/fixtures/snapshots/panel.ts",
        languageOptions: languageOpts,
      },
      {
        code: `export const fixture_signalPanel = {};`,
        filename: "src\\widgets\\components\\stories\\catalog\\fixtures\\panel.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const setup = true;`,
        filename: "src/widgets/components/stories/setup.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidStoriesDirectoryFile",
          },
        ],
        output: null,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/components/stories/helpers.js",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidStoriesDirectoryFile",
          },
        ],
        output: null,
      },
      {
        code: `export const runtime = true;`,
        filename: "src/widgets/components/stories/catalog/runtime.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidStoriesDirectoryFile" }],
        output: null,
      },
      {
        code: `export const renderPanel = () => null;`,
        filename: "src/widgets/components/stories/catalog/helpers.js",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidStoriesDirectoryFile" }],
        output: null,
      },
      {
        code: `export const runtime = true;`,
        filename: "src/widgets/components/stories/catalog/fixtures-extra/runtime.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidStoriesDirectoryFile",
          },
        ],
        output: null,
      },
    ],
  },
);
