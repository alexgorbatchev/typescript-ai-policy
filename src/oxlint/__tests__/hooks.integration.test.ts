import { describe, expect, it } from "bun:test";
import { FilenameStyle } from "../createOxlintConfig.ts";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

describe("hook lint-target integration", () => {
  it("retains raw JSX and direct-styling boundaries for TSX hooks", () => {
    expectLintTargetFailure(runLintTargetFixture("hook-test-file-convention/tsx-hook-raw-markup-invalid"), [
      {
        column: 11,
        filePath: "src/accounts/hooks/useAccount.tsx",
        line: 2,
        message:
          'Raw DOM markup only allowed inside component ownership files in "components/", "templates/", or "layouts/".',
        ruleId: "@alexgorbatchev(no-intrinsic-elements-outside-component-globs)",
        severity: "error",
      },
      {
        column: 15,
        filePath: "src/accounts/hooks/useAccount.tsx",
        line: 2,
        message:
          "Move styling into a component ownership file. Expose necessary variants instead of passing styling props here.",
        ruleId: "@alexgorbatchev(no-classname-style-props-outside-component-globs)",
        severity: "error",
      },
    ]);
  });
  it("allows hook ownership files with adjacent sibling tests", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/valid-with-adjacent-test");

    expectLintTargetSuccess(lintTargetResult);
  });

  it("reports hook ownership files that are missing a sibling hook test", () => {
    const lintTargetResult = runLintTargetFixture("hook-test-file-convention/missing-sibling-test-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/hooks/useAccount.ts",
        line: 1,
        message:
          'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory, using the same extension as the hook source.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
  });

  it("allows TSX hook ownership files with matching TSX sibling tests", () => {
    expectLintTargetSuccess(runLintTargetFixture("hook-test-file-convention/valid-tsx-with-adjacent-test"));
  });

  it("explains why a TSX test does not satisfy a TS hook ownership file", () => {
    expectLintTargetFailure(runLintTargetFixture("hook-test-file-convention/ts-source-tsx-test-invalid"), [
      {
        column: 1,
        filePath: "src/accounts/hooks/useAccount.ts",
        line: 1,
        message:
          'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory, using the same extension as the hook source.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
  });

  it("explains why a TS test does not satisfy a TSX hook ownership file", () => {
    expectLintTargetFailure(runLintTargetFixture("hook-test-file-convention/tsx-source-ts-test-invalid"), [
      {
        column: 1,
        filePath: "src/accounts/hooks/useAccount.tsx",
        line: 1,
        message:
          'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory, using the same extension as the hook source.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
  });

  it("requires a sibling test for TSX hook ownership files", () => {
    expectLintTargetFailure(runLintTargetFixture("hook-test-file-convention/tsx-source-missing-test-invalid"), [
      {
        column: 1,
        filePath: "src/accounts/hooks/useAccount.tsx",
        line: 1,
        message:
          'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory, using the same extension as the hook source.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
  });

  it("allows configured dash-case TSX hooks without component ownership requirements", () => {
    expectLintTargetSuccess(
      runLintTargetFixtureWithConsumerConfig(
        "hook-test-file-convention/valid-dash-case-tsx-with-adjacent-test",
        {},
        { filenameStyle: FilenameStyle.DashCase },
      ),
      FIXTURE_CONFIG_HEADER,
    );
  });

  it("reports exported hooks outside canonical hooks ownership files", () => {
    const lintTargetResult = runLintTargetFixture("hook-export-location-convention/misplaced-hook-export-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 8,
        filePath: "src/accounts/account.ts",
        line: 1,
        message: 'Place exported hooks in direct-child "hooks/useThing.ts{,x}" files.',
        ruleId: "@alexgorbatchev(hook-export-location-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports unsupported files inside hooks directories", () => {
    const lintTargetResult = runLintTargetFixture("hooks-directory-file-convention/invalid-hooks-directory-file");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/hooks/helpers.ts",
        line: 1,
        message: 'Only "useThing.ts{,x}", "index.ts", "types.ts", and "__tests__/**" are allowed in "hooks/".',
        ruleId: "@alexgorbatchev(hooks-directory-file-convention)",
        severity: "error",
      },
    ]);
  });

  it("reports dash-case hook ownership filenames by default", () => {
    const lintTargetResult = runLintTargetFixture("hook-file-naming-convention/dash-case-hook-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 1,
        filePath: "src/accounts/hooks/use-account.ts",
        line: 1,
        message: 'Only "useThing.ts{,x}", "index.ts", "types.ts", and "__tests__/**" are allowed in "hooks/".',
        ruleId: "@alexgorbatchev(hooks-directory-file-convention)",
        severity: "error",
      },
      {
        column: 8,
        filePath: "src/accounts/hooks/use-account.ts",
        line: 1,
        message: 'Place exported hooks in direct-child "hooks/useThing.ts{,x}" files.',
        ruleId: "@alexgorbatchev(hook-export-location-convention)",
        severity: "error",
      },
    ]);
  });

  it("allows dash-case hook ownership filenames when configured", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "hook-file-naming-convention/dash-case-hook-invalid",
      {},
      { filenameStyle: FilenameStyle.DashCase },
    );

    expectLintTargetSuccess(lintTargetResult, FIXTURE_CONFIG_HEADER);
  });
});

describe("hook dependency lint-target integration", () => {
  it("rejects missing effect dependencies as errors", () => {
    const result = runLintTargetFixture("exhaustive-deps/missing-dependency-invalid");

    expect(result.exitCode).toBe(1);
    expect(result.issues.map(({ ruleId, severity }) => ({ ruleId, severity }))).toEqual([
      { ruleId: "react-hooks(exhaustive-deps)", severity: "error" },
    ]);
  });

  it("accepts complete effect dependencies", () => {
    const result = runLintTargetFixture("exhaustive-deps/complete-dependencies-valid");

    expectLintTargetSuccess(result);
  });
});
