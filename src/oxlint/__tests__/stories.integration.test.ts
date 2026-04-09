import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("story lint-target integration", () => {
  it("allows Storybook default meta exports inside valid story directories", () => {
    const lintTargetResult = runLintTargetFixture("storybook-default-export-valid");

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

  it("reports story exports that omit play functions", () => {
    const lintTargetResult = runLintTargetFixture("storybook-missing-play-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        "  x @alexgorbatchev(story-export-contract): Add a `play` property to this story object. Component stories are the required interaction-test surface for the sibling component.",
        "    ,-[src/accounts/stories/AccountPanel.stories.tsx:12:24]",
        " 11 | ",
        " 12 | const Default: Story = {};",
        "    :                        ^^",
        " 13 | ",
        "    `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("reports misplaced story files with story-specific diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runLintTargetFixture("storybook-misplaced-file-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(story-file-location-convention): Move this story file under a "stories/" directory. Storybook files must not live outside a sibling "stories/" tree.`,
        "   ,-[src/app/App.stories.tsx:1:1]",
        ` 1 | import type { Meta, StoryObj } from "@storybook/react";`,
        "   : ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        ` 2 | import { App } from "./App";`,
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
