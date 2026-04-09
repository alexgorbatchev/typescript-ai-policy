import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("hook lint-target integration", () => {
  it("allows hook ownership files with adjacent sibling tests", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/valid-with-adjacent-test");

    expect(lintTargetResult.exitCode).toBe(0);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "Found 0 warnings and 0 errors.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("reports hook ownership files that are missing a sibling hook test", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/missing-sibling-test-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(hook-test-file-convention): Create "useAccount.test.ts" under ".../accounts/hooks/__tests__". Hook ownership files must keep their tests under a sibling "__tests__/" directory.`,
        "   ,-[src/accounts/hooks/useAccount.ts:1:1]",
        " 1 | ,-> export function useAccount() {",
        " 2 | |     return null;",
        " 3 | `-> }",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
