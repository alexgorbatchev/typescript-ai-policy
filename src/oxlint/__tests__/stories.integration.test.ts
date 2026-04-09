import { describe, expect, it } from "bun:test";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("story lint-target integration", () => {
  it("allows Storybook default meta exports inside valid story directories", () => {
    const lintTargetResult = runLintTargetFixture("import-no-default-export/valid-default-export");

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
    const lintTargetResult = runLintTargetFixture("story-export-contract/missing-play-invalid");

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
    const lintTargetResult = runLintTargetFixture("story-file-location-convention/misplaced-story-file-invalid");

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

  it("reports story files whose sibling component ownership file is missing", () => {
    const lintTargetResult = runLintTargetFixture("story-file-location-convention/missing-sibling-component-invalid");

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(story-file-location-convention): Rename or move this story so it matches an existing sibling component ownership file. ".../src/accounts/Missing.tsx" must exist for this story file.`,
        "   ,-[src/accounts/stories/catalog/Missing.stories.tsx:1:1]",
        ` 1 | import type { Meta, StoryObj } from "@storybook/react";`,
        "   : ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        ` 2 | import { Missing } from "../../Missing";`,
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
