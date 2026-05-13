import { expect } from "bun:test";
import type { LintTargetIssue, LintTargetResult } from "./runLintTarget.ts";

type ExpectedLintTargetIssue = Pick<
  LintTargetIssue,
  "column" | "filePath" | "line" | "message" | "ruleId" | "severity"
>;

type ExpectedLintTargetHeader = LintTargetResult["header"];

const EXPECTED_HEADER = {
  configPath: "<repo-root>/src/oxlint/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

function readSortedIssues(issues: ExpectedLintTargetIssue[]): ExpectedLintTargetIssue[] {
  return [...issues].sort((leftIssue, rightIssue) => {
    const leftKey = [
      leftIssue.filePath,
      String(leftIssue.line ?? -1).padStart(8, "0"),
      String(leftIssue.column ?? -1).padStart(8, "0"),
      leftIssue.ruleId,
      leftIssue.message,
      leftIssue.severity,
    ].join(":");
    const rightKey = [
      rightIssue.filePath,
      String(rightIssue.line ?? -1).padStart(8, "0"),
      String(rightIssue.column ?? -1).padStart(8, "0"),
      rightIssue.ruleId,
      rightIssue.message,
      rightIssue.severity,
    ].join(":");

    return leftKey.localeCompare(rightKey);
  });
}

function expectLintTargetHeader(
  lintTargetResult: LintTargetResult,
  expectedHeader: ExpectedLintTargetHeader = EXPECTED_HEADER,
): void {
  expect(lintTargetResult.header).toEqual(expectedHeader);
}

export function expectLintTargetSuccess(
  lintTargetResult: LintTargetResult,
  expectedHeader: ExpectedLintTargetHeader = EXPECTED_HEADER,
): void {
  expectLintTargetHeader(lintTargetResult, expectedHeader);
  expect(lintTargetResult.exitCode).toBe(0);
  expect(lintTargetResult.issues).toEqual([]);
}

export function expectLintTargetFailure(
  lintTargetResult: LintTargetResult,
  expectedIssues: ExpectedLintTargetIssue[],
  expectedHeader: ExpectedLintTargetHeader = EXPECTED_HEADER,
): void {
  expectLintTargetHeader(lintTargetResult, expectedHeader);
  expect(lintTargetResult.exitCode).toBe(1);
  expect(readSortedIssues(lintTargetResult.issues)).toEqual(readSortedIssues(expectedIssues));
}
