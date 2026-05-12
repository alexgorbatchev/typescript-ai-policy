import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "./expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "./runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

const COMPONENT_GLOB_SETTINGS = {
  "@alexgorbatchev": {
    componentGlobs: ["src/**/*.tsx"],
  },
};

describe("story lint-target integration", () => {
  it("allows Storybook default meta exports inside valid story directories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "import-no-default-export/valid-default-export",
      COMPONENT_GLOB_SETTINGS,
    );

    expectLintTargetSuccess(lintTargetResult, FIXTURE_CONFIG_HEADER);
  });

  it("reports story exports that omit play functions", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "story-export-contract/missing-play-invalid",
      COMPONENT_GLOB_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 24,
          filePath: "src/accounts/stories/AccountPanel.stories.tsx",
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
      COMPONENT_GLOB_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 7,
          filePath: "src/accounts/stories/catalog/AccountPanel.stories.tsx",
          line: 4,
          message:
            'Add `title: "@my-org/my-package/accounts/catalog/AccountPanel"` to this meta object. Storybook titles must match the package-relative story path without the structural `src/` or `stories/` segments.',
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
      COMPONENT_GLOB_SETTINGS,
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
      COMPONENT_GLOB_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 1,
          filePath: "src/accounts/stories/catalog/Missing.stories.tsx",
          line: 1,
          message:
            'Rename or move this story so it matches an existing sibling component ownership file. ".../src/accounts/Missing.tsx" must exist for this story file.',
          ruleId: "@alexgorbatchev(story-file-location-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
