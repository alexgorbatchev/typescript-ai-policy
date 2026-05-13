import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";

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

  it("reports unsupported files inside __tests__ directories", () => {
    const lintTargetResult = runLintTargetFixture("tests-directory-file-convention/invalid-tests-directory-file");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/widgets/__tests__/setup.ts",
        line: 1,
        message:
          'Move or rename "setup.ts". A "__tests__" directory may contain only "*.test.ts", "*.test.tsx", "helpers.ts", "helpers.tsx", "fixtures.ts", "fixtures.tsx", or files under "fixtures/".',
        ruleId: "@alexgorbatchev(tests-directory-file-convention)",
        severity: "error",
      },
    ]);
  });
});
