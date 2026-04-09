import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "./expectLintTargetResult.ts";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("component lint-target integration", () => {
  it("reports component ownership files that are missing a sibling story", () => {
    const lintTargetResult = runLintTargetFixture("component-story-file-convention/missing-sibling-story-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 17,
        filePath: "src/accounts/Button.tsx",
        line: 1,
        message:
          'Create "Button.stories.tsx" under ".../src/accounts/stories". Component ownership files must keep their Storybook coverage under a sibling "stories/" directory.',
        ruleId: "@alexgorbatchev(component-story-file-convention)",
        severity: "error",
      },
    ]);
  });
});
