import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

const CONSUMER_SETTINGS = {};

describe("story lint-target integration", () => {
  it("allows Storybook default meta exports inside valid story directories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "import-no-default-export/valid-default-export",
      CONSUMER_SETTINGS,
    );

    expectLintTargetSuccess(lintTargetResult, FIXTURE_CONFIG_HEADER);
  });

  it("reports story exports that omit play functions", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "story-export-contract/missing-play-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 24,
          filePath: "src/accounts/components/stories/AccountPanel.stories.tsx",
          line: 13,
          message:
            "Add a `play` property to this story object. Component stories are the required interaction-test surface for the sibling component.",
          ruleId: "@alexgorbatchev(story-export-contract)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports story meta titles that do not match the package-relative story path", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "story-title-convention/missing-title-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 7,
          filePath: "src/accounts/components/stories/AccountPanel.stories.tsx",
          line: 4,
          message:
            'Add `title: "@my-org/my-package/accounts/components/AccountPanel"` to this meta object. Storybook titles must match the package-relative story path without the structural `src/` or `stories/` segments.',
          ruleId: "@alexgorbatchev(story-title-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports misplaced story files with story-specific diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "story-file-location-convention/misplaced-story-file-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/app/App.stories.tsx",
          line: 1,
          message:
            'Move this story file under a "stories/" directory. Storybook files must not live outside a sibling "stories/" tree.',
          ruleId: "@alexgorbatchev(story-file-location-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports story files whose sibling component ownership file is missing", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "story-file-location-convention/missing-sibling-component-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/accounts/components/stories/Missing.stories.tsx",
          line: 1,
          message:
            'Rename or move this story so it matches an existing sibling component ownership file. ".../accounts/components/Missing.tsx" must exist for this story file.',
          ruleId: "@alexgorbatchev(story-file-location-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports unsupported files inside stories directories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "stories-directory-file-convention/invalid-stories-directory-file",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/widgets/components/stories/setup.ts",
          line: 1,
          message:
            'Move or rename "setup.ts". A "stories" directory may contain only "*.stories.tsx", "helpers.ts", "helpers.tsx", "fixtures.ts", "fixtures.tsx", or files under "fixtures/".',
          ruleId: "@alexgorbatchev(stories-directory-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
