import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("test-file lint-target integration", () => {
  it("reports misplaced test files with test-location diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runLintTargetFixture("test-file-location-convention/misplaced-test-file-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(test-file-location-convention): Move this test file into a sibling "__tests__/" directory. Misplaced tests belong at "__tests__/basename.test.ts[x]" next to the source they cover.`,
        "   ,-[src/widgets/SignalPanel.test.tsx:1:1]",
        ` 1 | import { test } from "bun:test";`,
        "   : ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        " 2 | ",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
