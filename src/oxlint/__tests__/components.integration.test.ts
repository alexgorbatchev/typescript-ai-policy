import { describe, it } from "bun:test";
import { FilenameStyle } from "../createOxlintConfig.ts";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";

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
          message: 'Create the matching ".stories.tsx" file under a sibling "stories/" directory.',
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
          message: 'Place non-hook, non-test ".tsx" ownership files under "components/", "templates/", or "layouts/".',
          ruleId: "@alexgorbatchev(component-file-location-convention)",
          severity: "error",
        },
        {
          column: 11,
          filePath: "src/accounts/AccountPanel.tsx",
          line: 2,
          message:
            'Raw DOM markup only allowed inside component ownership files in "components/", "templates/", or "layouts/".',
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
            'Only component ".tsx" files, "constants.ts", "index.ts", "types.ts", nested component subdirectories, and "stories/**" are allowed in "components/", "templates/", and "layouts/".',
          ruleId: "@alexgorbatchev(component-directory-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports dash-case component ownership filenames by default", () => {
    const lintTargetResult = runLintTargetFixture("component-file-naming-convention/dash-case-component-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/components/account-panel.tsx",
        line: 1,
        message:
          "Rename this file to the configured ComponentName.tsx basename that matches the exported component name.",
        ruleId: "@alexgorbatchev(component-file-naming-convention)",
        severity: "error",
      },
    ]);
  });

  it("allows dash-case component ownership filenames when configured", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "component-file-naming-convention/dash-case-component-invalid",
      {},
      { filenameStyle: FilenameStyle.DashCase },
    );

    expectLintTargetSuccess(lintTargetResult, FIXTURE_CONFIG_HEADER);
  });
});
