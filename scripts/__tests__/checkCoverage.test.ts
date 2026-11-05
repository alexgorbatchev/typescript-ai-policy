import { expect, test } from "bun:test";
import { mkdtempDisposable } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkCoverage } from "../checkCoverage.ts";
import { fixture_coverageReport, fixture_weightedCoverageReport } from "./fixtures";

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");

test("weights production counts, accepts the exact threshold and excludes test coverage", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "coverage-gate-"));
  await Bun.write(join(directory.path, "src/large.ts"), "export function large() { return 1; }");
  await Bun.write(join(directory.path, "src/small.ts"), "export function small() { return 2; }");
  expect(await checkCoverage(await fixture_weightedCoverageReport.text(), directory.path)).toBe(
    "Production coverage (2 runtime modules): lines 9/10 (90.00%) functions 9/10 (90.00%)",
  );
});

test.each([
  { from: "DA:9,1\nLF:9\nLH:9", to: "DA:9,0\nLF:9\nLH:8", lines: "8/10 (80.00%)", functions: "9/10 (90.00%)" },
  { from: "FNH:9", to: "FNH:8", lines: "9/10 (90.00%)", functions: "8/10 (80.00%)" },
])("rejects insufficient weighted coverage: $lines lines, $functions functions", async (change) => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "coverage-gate-"));
  await Bun.write(join(directory.path, "src/large.ts"), "export function large() { return 1; }");
  await Bun.write(join(directory.path, "src/small.ts"), "export function small() { return 2; }");
  const report = (await fixture_weightedCoverageReport.text()).replace(change.from, change.to);
  await expect(checkCoverage(report, directory.path)).rejects.toThrow(
    `Production coverage (2 runtime modules): lines ${change.lines} functions ${change.functions}\nRequired: at least 90% weighted lines and functions`,
  );
});

test("fails when new runtime code is missing even if loaded files have perfect coverage", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "coverage-gate-"));
  await Bun.write(join(directory.path, "src/code.ts"), "export function code() { return 1; }");
  await Bun.write(join(directory.path, "src/unloaded.ts"), "export function unloaded() { return 2; }");
  const report = (await fixture_coverageReport.text())
    .replace("FNH:1", "FNH:2")
    .replace("DA:3,0", "DA:3,1")
    .replace("LH:2", "LH:3");
  await expect(checkCoverage(report, directory.path)).rejects.toThrow("Missing production coverage:\nsrc/unloaded.ts");
});

test("rejects a report without production runtime evidence", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "coverage-gate-"));
  await Bun.write(join(directory.path, "src/types.ts"), "export type Name = string;");
  await expect(checkCoverage(await fixture_coverageReport.text(), directory.path)).rejects.toThrow(
    "Empty or invalid production coverage totals",
  );
});
