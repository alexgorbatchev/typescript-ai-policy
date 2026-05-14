import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storiesDirectoryFileConventionRuleModule from "../stories-directory-file-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const storiesDirectoryFileConventionRuleTester = new RuleTester();
const EXPECTED_STORIES_DIRECTORY_FILE_GUIDANCE =
  'Keep "stories/" limited to "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move runtime files and other support roles out of the story tree.';

it("uses the approved stories directory guidance", () => {
  expect(storiesDirectoryFileConventionRuleModule.meta.docs?.guidance).toBe(EXPECTED_STORIES_DIRECTORY_FILE_GUIDANCE);
});

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
        code: `export default {};`,
        filename: "src/widgets/components/stories/subdir/SignalPanel.stories.tsx",
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
