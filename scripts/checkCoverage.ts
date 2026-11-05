import { relative } from "node:path";
import { readCoverage } from "./readCoverage.ts";
import { readRuntimeSources } from "./readRuntimeSources.ts";
import type { ICoverageCounts } from "./types.ts";

export async function checkCoverage(report: string, root: string): Promise<string> {
  const records = readCoverage(report, root);
  const sources = await readRuntimeSources(root);
  const missing = sources.filter((source) => !records.has(source));
  if (missing.length > 0) {
    throw new Error(`Missing production coverage:\n${missing.map((source) => relative(root, source)).join("\n")}`);
  }
  const total: ICoverageCounts = { linesFound: 0, linesHit: 0, functionsFound: 0, functionsHit: 0 };
  for (const source of sources) {
    const record = records.get(source);
    if (!record) throw new Error(`Missing production coverage: ${source}`);
    total.linesFound += record.linesFound;
    total.linesHit += record.linesHit;
    total.functionsFound += record.functionsFound;
    total.functionsHit += record.functionsHit;
  }
  if (!Object.values(total).every(Number.isSafeInteger) || total.linesFound === 0 || total.functionsFound === 0) {
    throw new Error("Empty or invalid production coverage totals");
  }
  const summary = [
    `Production coverage (${sources.length} runtime modules):`,
    `lines ${total.linesHit}/${total.linesFound} (${((100 * total.linesHit) / total.linesFound).toFixed(2)}%)`,
    `functions ${total.functionsHit}/${total.functionsFound} (${((100 * total.functionsHit) / total.functionsFound).toFixed(2)}%)`,
  ].join(" ");
  if (total.linesHit / total.linesFound < 0.9 || total.functionsHit / total.functionsFound < 0.9) {
    throw new Error(`${summary}\nRequired: at least 90% weighted lines and functions`);
  }
  return summary;
}
