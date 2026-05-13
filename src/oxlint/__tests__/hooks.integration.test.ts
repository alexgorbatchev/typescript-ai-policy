import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";

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

  it("reports exported hooks outside canonical hooks ownership files", () => {
    const lintTargetResult = runLintTargetFixture("hook-export-location-convention/misplaced-hook-export-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 8,
        filePath: "src/accounts/account.ts",
        line: 1,
        message:
          'Move exported hook "useAccount" into a direct-child ownership file under a "hooks/" directory. Valid filenames are "hooks/useAccount.ts" or "hooks/use-account.ts".',
        ruleId: "@alexgorbatchev(hook-export-location-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports unsupported files inside hooks directories", () => {
    const lintTargetResult = runLintTargetFixture("hooks-directory-file-convention/invalid-hooks-directory-file");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/hooks/helpers.ts",
        line: 1,
        message:
          'Move or rename "helpers.ts". A "hooks/" directory may contain only direct-child "use*.ts" or "use*.tsx" ownership files, direct-child "index.ts" or "types.ts" files, or a direct-child "__tests__/" tree.',
        ruleId: "@alexgorbatchev(hooks-directory-file-convention)",
        severity: "error",
      },
    ]);
  });
});
