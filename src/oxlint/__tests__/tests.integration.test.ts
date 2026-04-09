import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "./expectLintTargetResult.ts";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("test-file lint-target integration", () => {
  it("reports misplaced test files with test-location diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runLintTargetFixture("test-file-location-convention/misplaced-test-file-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/widgets/SignalPanel.test.tsx",
        line: 1,
        message:
          'Move this test file into a sibling "__tests__/" directory. Misplaced tests belong at "__tests__/basename.test.ts[x]" next to the source they cover.',
        ruleId: "@alexgorbatchev(test-file-location-convention)",
        severity: "error",
      },
    ]);
  });
});
