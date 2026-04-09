import { afterAll, describe, expect, it } from "bun:test";
import { rmSync } from "node:fs";
import { createFixtureRepo } from "./createFixtureRepo.ts";
import { runLintTarget } from "./runLintTarget.ts";

const createdFixtureRepositoryPaths: string[] = [];

function runFixture(fixtureName: string) {
  const fixtureRepositoryPath = createFixtureRepo(fixtureName);
  createdFixtureRepositoryPaths.push(fixtureRepositoryPath);

  return runLintTarget(fixtureRepositoryPath);
}

afterAll(() => {
  createdFixtureRepositoryPaths.forEach((fixtureRepositoryPath) => {
    rmSync(fixtureRepositoryPath, { recursive: true, force: true });
  });
});

describe("lint-target integration", () => {
  it("allows Storybook default meta exports inside valid story directories", () => {
    const lintTargetResult = runFixture("storybook-default-export-valid");

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
    const lintTargetResult = runFixture("storybook-missing-play-invalid");

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

  it("reports fixture exports that leak outside fixture entrypoints", () => {
    const lintTargetResult = runFixture("fixture-export-leak-invalid");

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

  it("reports misplaced story files with story-specific diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runFixture("storybook-misplaced-file-invalid");

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

  it("reports misplaced test files with test-location diagnostics instead of component-owner noise", () => {
    const lintTargetResult = runFixture("misplaced-test-file-invalid");

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

  it("allows hook ownership files with adjacent sibling tests", () => {
    const lintTargetResult = runFixture("hook-valid-with-adjacent-test");

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
    const lintTargetResult = runFixture("hook-missing-sibling-test-invalid");

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
