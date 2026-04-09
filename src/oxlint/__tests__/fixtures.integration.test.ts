import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("fixture lint-target integration", () => {
  it("reports fixture exports that leak outside fixture entrypoints", () => {
    const lintTargetResult = runLintTargetFixture("fixture-export-leak-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(no-fixture-exports-outside-fixture-entrypoint): Move "fixture_userAccountRows" into a nested "fixtures.ts" or "fixtures.tsx" entrypoint under "__tests__/" or "stories/" and export it only from there.`,
        "   ,-[src/accounts/buildRows.ts:1:8]",
        ` 1 | export const fixture_userAccountRows = [{ id: "1" }];`,
        "   :        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
