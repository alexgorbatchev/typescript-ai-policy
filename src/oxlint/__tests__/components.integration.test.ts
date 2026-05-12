import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "./expectLintTargetResult.ts";
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

describe("component lint-target integration", () => {
  it("reports component ownership files that are missing a sibling story", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "component-story-file-convention/missing-sibling-story-invalid",
      COMPONENT_GLOB_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 17,
          filePath: "src/accounts/Button.tsx",
          line: 1,
          message:
            'Create "Button.stories.tsx" under ".../src/accounts/stories". Component ownership files must keep their Storybook coverage under a sibling "stories/" directory.',
          ruleId: "@alexgorbatchev(component-story-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
