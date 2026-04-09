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

  it("reports aliased fixture imports in tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/aliased-fixture-import-in-test-invalid",
    );

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(fixture-import-path-convention): Import "fixture_userAccountRows" from a relative "fixtures" module without renaming it. The local binding must stay "fixture_userAccountRows".`,
        "   ,-[src/accounts/__tests__/rows.test.ts:2:10]",
        ` 1 | import { expect, test } from "bun:test";`,
        ` 2 | import { fixture_userAccountRows as accountRows } from "./fixtures";`,
        "   :          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        " 3 | ",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("reports alternate fixture import paths in stories", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/alternate-fixtures-path-in-story-invalid",
    );

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(fixture-import-path-convention): Change this import so "fixture_accountPanel" comes from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree.`,
        "   ,-[src/accounts/stories/AccountPanel.stories.tsx:3:10]",
        ` 2 | import { AccountPanel } from "../AccountPanel";`,
        ` 3 | import { fixture_accountPanel } from "./fixtures.ts";`,
        "   :          ^^^^^^^^^^^^^^^^^^^^",
        " 4 | ",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("reports inline fixture bindings in stories", () => {
    const lintTargetResult = runLintTargetFixture(
      "no-inline-fixture-bindings-in-tests/inline-fixture-binding-in-story-invalid",
    );

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(no-inline-fixture-bindings-in-tests): Delete the inline "fixture_accountPanel" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.`,
        "    ,-[src/accounts/stories/AccountPanel.stories.tsx:12:7]",
        " 11 |     ",
        " 12 | ,-> const fixture_accountPanel = {",
        ' 13 | |     label: "Ready",',
        " 14 | `-> };",
        " 15 |     ",
        "    `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("allows nested tests to import fixtures from the sibling support tree", () => {
    const lintTargetResult = runLintTargetFixture("fixture-import-path-convention/nested-test-valid-relative-fixtures");

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

  it("reports wrong-tree fixture imports in nested tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/wrong-tree-fixture-import-in-nested-test-invalid",
    );

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(fixture-import-path-convention): Change this import so "fixture_userAccountRows" comes from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree.`,
        "   ,-[src/accounts/__tests__/integration/rows.test.ts:2:10]",
        ` 1 | import { expect, test } from "bun:test";`,
        ` 2 | import { fixture_userAccountRows } from "../../other-feature/__tests__/fixtures";`,
        "   :          ^^^^^^^^^^^^^^^^^^^^^^^",
        " 3 | ",
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });

  it("reports inline fixture bindings in tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "no-inline-fixture-bindings-in-tests/inline-fixture-binding-in-test-invalid",
    );

    expect(lintTargetResult.exitCode).toBe(1);
    expect(lintTargetResult.output).toBe(
      [
        "==> oxlint",
        "config: <repo-root>/src/oxlint/oxlint.config.ts",
        "target: <fixture-root>",
        "",
        `  x @alexgorbatchev(no-inline-fixture-bindings-in-tests): Delete the inline "fixture_userAccountRows" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.`,
        "   ,-[src/accounts/__tests__/rows.test.ts:3:7]",
        ` 2 | `,
        ` 3 | const fixture_userAccountRows = [{ id: "1" }];`,
        "   :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
        ` 4 | `,
        "   `----",
        "",
        "Found 0 warnings and 1 error.",
        "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
      ].join("\n"),
    );
  });
});
