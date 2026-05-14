import { describe, it } from "bun:test";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

const CONSUMER_SETTINGS = {};

describe("fixture lint-target integration", () => {
  it("reports fixture exports that leak outside fixture entrypoints", () => {
    const lintTargetResult = runLintTargetFixture("no-fixture-exports-outside-fixture-entrypoint/export-leak-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 8,
        filePath: "src/accounts/buildRows.ts",
        line: 1,
        message:
          'Export fixture helpers only from nested "fixtures.ts" or "fixtures.tsx" entrypoints under "__tests__/" or "stories/".',
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
        message: "Use exactly one fixture entrypoint shape per fixture-support directory.",
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
        message: 'Import fixture bindings from relative "fixtures" modules without renaming them.',
        ruleId: "@alexgorbatchev(fixture-import-path-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports alternate fixture import paths in stories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "fixture-import-path-convention/alternate-fixtures-path-in-story-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 10,
          filePath: "src/accounts/components/stories/AccountPanel.stories.tsx",
          line: 3,
          message:
            'Import fixture bindings from relative "fixtures" modules in the same "__tests__/" or "stories/" tree.',
          ruleId: "@alexgorbatchev(fixture-import-path-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports inline fixture bindings in stories", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "no-inline-fixture-bindings-in-tests/inline-fixture-binding-in-story-invalid",
      CONSUMER_SETTINGS,
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 7,
          filePath: "src/accounts/components/stories/AccountPanel.stories.tsx",
          line: 13,
          message:
            'Delete the inline "fixture_accountPanel" declaration from this file and import it from a relative "fixtures" module under the same "__tests__/" or "stories/" tree instead.',
          ruleId: "@alexgorbatchev(no-inline-fixture-bindings-in-tests)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("allows direct-child tests to import fixtures from the sibling support tree", () => {
    const lintTargetResult = runLintTargetFixture("fixture-import-path-convention/nested-test-valid-relative-fixtures");

    expectLintTargetSuccess(lintTargetResult);
  });

  it("reports wrong-tree fixture imports in direct-child tests", () => {
    const lintTargetResult = runLintTargetFixture(
      "fixture-import-path-convention/wrong-tree-fixture-import-in-nested-test-invalid",
    );

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 10,
        filePath: "src/accounts/__tests__/rows.test.ts",
        line: 2,
        message:
          'Import fixture bindings from relative "fixtures" modules in the same "__tests__/" or "stories/" tree.',
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
