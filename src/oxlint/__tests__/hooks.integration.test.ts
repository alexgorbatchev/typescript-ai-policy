import { describe, it } from "bun:test";
import { FilenameStyle } from "../createOxlintConfig.ts";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

describe("hook lint-target integration", () => {
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
        message: 'Create the matching ".test.ts" or ".test.tsx" file under a sibling "__tests__/" directory.',
        ruleId: "@alexgorbatchev(hook-test-file-convention)",
        severity: "error",
      },
    ]);
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
