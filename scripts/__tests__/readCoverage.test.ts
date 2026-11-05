import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { readCoverage } from "../readCoverage.ts";
import { fixture_coverageReport } from "./fixtures";

test("reads Bun line and function counters with normalized source paths", async () => {
  const counts = { linesFound: 3, linesHit: 2, functionsFound: 2, functionsHit: 1 };
  const report = await fixture_coverageReport.text();
  expect(readCoverage(report.replaceAll("\n", "\r\n"), "/project")).toEqual(
    new Map([[resolve("/project/src/code.ts"), counts]]),
  );
});

test("accepts a source filename containing the record terminator text", async () => {
  const report = (await fixture_coverageReport.text()).replace("SF:src/code.ts", "SF:src/end_of_record.ts");
  expect([...readCoverage(report, "/project").keys()]).toEqual([resolve("/project/src/end_of_record.ts")]);
});

test.each([
  { from: "end_of_record", to: "", message: "Unterminated LCOV record" },
  { from: "\nend_of_record", to: "end_of_record", message: "Unterminated LCOV record" },
  { from: "LF:3\n", to: "", message: "Missing LCOV LF: src/code.ts" },
  { from: "FNF:2", to: "FNF:2\nFNF:2", message: "Repeated LCOV field: FNF" },
  { from: "FNF:2", to: "FNF:2invalid", message: "Invalid LCOV FNF: 2invalid" },
  { from: "FNH:1", to: "FNH:-1", message: "Invalid LCOV FNH: -1" },
  { from: "FNH:1", to: "FNH:1.5", message: "Invalid LCOV FNH: 1.5" },
  { from: "FNH:1", to: "FNH:9007199254740992", message: "Invalid LCOV FNH: 9007199254740992" },
  { from: "FNH:1", to: "FNH:3", message: "Inconsistent LCOV counters: src/code.ts" },
  { from: "DA:1,1", to: "DA:1,1\nDA:1,0", message: "Invalid LCOV line: 1" },
  { from: "DA:1,1", to: "DA:0,1", message: "Invalid LCOV line: 0" },
  { from: "DA:1,1", to: "DA:1,", message: "Invalid LCOV DA hits: " },
  { from: "DA:1,1", to: "DA:1,1,extra", message: "Invalid LCOV DA: 1,1,extra" },
  { from: "LF:3", to: "LF:4", message: "Inconsistent LCOV counters: src/code.ts" },
  { from: "LH:2", to: "LH:3", message: "Inconsistent LCOV counters: src/code.ts" },
  { from: "SF:src/code.ts", to: "SF:", message: "Missing LCOV source" },
  { from: "TN:", to: "UNKNOWN:1", message: "Unsupported LCOV field: UNKNOWN" },
])("rejects malformed report: $message", async ({ from, to, message }) => {
  const report = await fixture_coverageReport.text();
  expect(() => readCoverage(report.replace(from, to), "/project")).toThrow(message);
});

test("rejects duplicate normalized files and empty reports", async () => {
  const report = await fixture_coverageReport.text();
  expect(() => readCoverage(report + report.replace("SF:src/", "SF:./src/"), "/project")).toThrow(
    "Duplicate LCOV source: ./src/code.ts",
  );
  expect(() => readCoverage("", "/project")).toThrow("Empty LCOV report");
});
