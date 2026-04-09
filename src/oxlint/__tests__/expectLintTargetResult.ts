import { expect } from "bun:test";
import type { LintTargetIssue, LintTargetResult } from "./runLintTarget.ts";

type ExpectedLintTargetIssue = Pick<
  LintTargetIssue,
  "column" | "filePath" | "line" | "message" | "ruleId" | "severity"
>;

const EXPECTED_HEADER = {
  configPath: "<repo-root>/src/oxlint/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

function expectLintTargetHeader(lintTargetResult: LintTargetResult): void {
  expect(lintTargetResult.header).toEqual(EXPECTED_HEADER);
}

export function expectLintTargetSuccess(lintTargetResult: LintTargetResult): void {
  expectLintTargetHeader(lintTargetResult);
  expect(lintTargetResult.exitCode).toBe(0);
  expect(lintTargetResult.issues).toEqual([]);
}

export function expectLintTargetFailure(
  lintTargetResult: LintTargetResult,
  expectedIssues: ExpectedLintTargetIssue[],
): void {
  expectLintTargetHeader(lintTargetResult);
  expect(lintTargetResult.exitCode).toBe(1);
  expect(lintTargetResult.issues).toEqual(expectedIssues);
}
