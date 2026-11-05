import type { BunFile } from "bun";

export const fixture_artifactWriter: BunFile = Bun.file(new URL("./artifactWriter.ts.txt", import.meta.url));
export const fixture_processTree: BunFile = Bun.file(new URL("./processTree.ts.txt", import.meta.url));
export const fixture_waitingTest: BunFile = Bun.file(new URL("./waitingTest.ts.txt", import.meta.url));
export const fixture_completedTest: BunFile = Bun.file(new URL("./completedTest.ts.txt", import.meta.url));
export const fixture_timedOutTest: BunFile = Bun.file(new URL("./timedOutTest.ts.txt", import.meta.url));

export const fixture_coverageReport: BunFile = Bun.file(new URL("./coverage.lcov.txt", import.meta.url));
export const fixture_weightedCoverageReport: BunFile = Bun.file(
  new URL("./weightedCoverage.lcov.txt", import.meta.url),
);
