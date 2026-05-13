import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

const CONSUMER_SETTINGS = {};

describe("component lint-target integration", () => {
  it("reports component ownership files that are missing a sibling story", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "component-story-file-convention/missing-sibling-story-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 17,
          filePath: "src/accounts/components/Button.tsx",
          line: 1,
          message:
            'Create "Button.stories.tsx" under ".../accounts/components/stories". Component ownership files must keep their Storybook coverage under a sibling "stories/" directory.',
          ruleId: "@alexgorbatchev(component-story-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports component ownership files outside canonical component directories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "component-file-location-convention/misplaced-component-file-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/accounts/AccountPanel.tsx",
          line: 1,
          message:
            'Move this ".tsx" file under a "components", "templates", or "layouts" directory. Files inside "hooks/" and "__tests__/" are exempt from this placement rule.',
          ruleId: "@alexgorbatchev(component-file-location-convention)",
          severity: "error",
        },
        {
          column: 11,
          filePath: "src/accounts/AccountPanel.tsx",
          line: 2,
          message:
            "Replace intrinsic JSX elements with imported components outside canonical component areas. Keep raw DOM markup only inside component ownership files.",
          ruleId: "@alexgorbatchev(no-intrinsic-elements-outside-component-globs)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports non-component support files inside canonical component directories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "component-directory-file-convention/invalid-component-directory-file",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/accounts/components/utils.ts",
          line: 1,
          message:
            'Move or rename "utils.ts". A "components/" directory may contain only component ".tsx" files, nested component-area subdirectories, "constants.ts", "index.ts", or "types.ts" support files, or a sibling "stories/" tree.',
          ruleId: "@alexgorbatchev(component-directory-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
