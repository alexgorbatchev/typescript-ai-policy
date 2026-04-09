import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "./expectLintTargetResult.ts";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("hook lint-target integration", () => {
  it("allows hook ownership files with adjacent sibling tests", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/valid-with-adjacent-test");

    expectLintTargetSuccess(lintTargetResult);
  });

  it("reports hook ownership files that are missing a sibling hook test", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/missing-sibling-test-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/hooks/useAccount.ts",
        line: 1,
        message:
          'Create "useAccount.test.ts" under ".../accounts/hooks/__tests__". Hook ownership files must keep their tests under a sibling "__tests__/" directory.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
  });
});
