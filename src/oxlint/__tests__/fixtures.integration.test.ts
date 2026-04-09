import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "./expectLintTargetResult.ts";
import { runLintTargetFixture } from "./runLintTargetFixture.ts";

describe("fixture lint-target integration", () => {
  it("reports fixture exports that leak outside fixture entrypoints", () => {
    const lintTargetResult = runLintTargetFixture("no-fixture-exports-outside-fixture-entrypoint/export-leak-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 8,
        filePath: "src/accounts/buildRows.ts",
        line: 1,
        message:
          'Move "fixture_userAccountRows" into a nested "fixtures.ts" or "fixtures.tsx" entrypoint under "__tests__/" or "stories/" and export it only from there.',
        ruleId: "@alexgorbatchev(no-fixture-exports-outside-fixture-entrypoint)",
        severity: "error",
      },
    ]);
  });

  it("reports fixture-support directories that declare multiple fixture entrypoint shapes", () => {
    const lintTargetResult = runLintTargetFixture("single-fixture-entrypoint/duplicate-entrypoints-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/stories/fixtures.ts",
        line: 1,
        message:
          'Keep exactly one fixture entrypoint shape in this fixture-support directory under "stories" so "./fixtures" resolves unambiguously. Remove all but one of: fixtures.ts, fixtures/.',
        ruleId: "@alexgorbatchev(single-fixture-entrypoint)",
        severity: "error",
      },
    ]);
  });

  it("reports aliased fixture imports in tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/aliased-fixture-import-in-test-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 10,
        filePath: "src/accounts/__tests__/rows.test.ts",
        line: 2,
        message:
          'Import "fixture_userAccountRows" from a relative "fixtures" module without renaming it. The local binding must stay "fixture_userAccountRows".',
        ruleId: "@alexgorbatchev(fixture-import-path-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports alternate fixture import paths in stories", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/alternate-fixtures-path-in-story-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 10,
        filePath: "src/accounts/stories/AccountPanel.stories.tsx",
        line: 3,
        message:
          'Change this import so "fixture_accountPanel" comes from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree.',
        ruleId: "@alexgorbatchev(fixture-import-path-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports inline fixture bindings in stories", () => {
    const lintTargetResult = runLintTargetFixture(
      "no-inline-fixture-bindings-in-tests/inline-fixture-binding-in-story-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 7,
        filePath: "src/accounts/stories/AccountPanel.stories.tsx",
        line: 12,
        message:
          'Delete the inline "fixture_accountPanel" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.',
        ruleId: "@alexgorbatchev(no-inline-fixture-bindings-in-tests)",
        severity: "error",
      },
    ]);
  });

  it("allows nested tests to import fixtures from the sibling support tree", () => {
    const lintTargetResult = runLintTargetFixture("fixture-import-path-convention/nested-test-valid-relative-fixtures");

    expectLintTargetSuccess(lintTargetResult);
  });

  it("reports wrong-tree fixture imports in nested tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/wrong-tree-fixture-import-in-nested-test-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 10,
        filePath: "src/accounts/__tests__/integration/rows.test.ts",
        line: 2,
        message:
          'Change this import so "fixture_userAccountRows" comes from a relative "fixtures" module inside the same "__tests__/" or "stories/" tree.',
        ruleId: "@alexgorbatchev(fixture-import-path-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports inline fixture bindings in tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "no-inline-fixture-bindings-in-tests/inline-fixture-binding-in-test-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 7,
        filePath: "src/accounts/__tests__/rows.test.ts",
        line: 3,
        message:
          'Delete the inline "fixture_userAccountRows" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.',
        ruleId: "@alexgorbatchev(no-inline-fixture-bindings-in-tests)",
        severity: "error",
      },
    ]);
  });
});
