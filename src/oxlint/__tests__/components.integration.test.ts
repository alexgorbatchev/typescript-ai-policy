import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("component lint-target integration", () => {
  it("reports component ownership files that are missing a sibling story", () => {
    const lintTargetResult = runLintTargetFixture("component-story-file-convention/missing-sibling-story-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(component-story-file-convention): Create "Button.stories.tsx" under ".../src/accounts/stories". Component ownership files must keep their Storybook coverage under a sibling "stories/" directory.`,
        "   ,-[src/accounts/Button.tsx:1:17]",
        " 1 | export function Button() {",
        "   :                 ^^^^^^",
        ' 2 |   return <button data-testid="Button" />;',
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
