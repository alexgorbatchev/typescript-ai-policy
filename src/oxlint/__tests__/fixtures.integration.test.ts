import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("fixture lint-target integration", () => {
  it("reports fixture exports that leak outside fixture entrypoints", () => {
    const lintTargetResult = runLintTargetFixture("no-fixture-exports-outside-fixture-entrypoint/export-leak-invalid");

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

  it("reports fixture-support directories that declare multiple fixture entrypoint shapes", () => {
    const lintTargetResult = runLintTargetFixture("single-fixture-entrypoint/duplicate-entrypoints-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(single-fixture-entrypoint): Keep exactly one fixture entrypoint shape in this fixture-support directory under "stories" so "./fixtures" resolves unambiguously. Remove all but one of: fixtures.ts, fixtures/.`,
        "   ,-[src/accounts/stories/fixtures.ts:1:1]",
        ` 1 | import type { StoryRow } from "../../StoryRow";`,
        "   : ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        " 2 | ",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
