import { expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RULES_DIRECTORY_PATH = join(import.meta.dir, "../rules");
const RULE_FILE_NAMES = readdirSync(RULES_DIRECTORY_PATH)
  .filter((fileName) => fileName.endsWith(".ts"))
  .filter((fileName) => fileName !== "helpers.ts")
  .filter((fileName) => fileName !== "types.ts")
  .sort();

it("defines meta.docs.guidance inside every rule module file", () => {
  const ruleFileNamesMissingGuidance = RULE_FILE_NAMES.filter((fileName) => {
    const ruleFileContent = readFileSync(join(RULES_DIRECTORY_PATH, fileName), "utf8");
    return !/docs:\s*\{[\s\S]*?guidance:\s*["`][\s\S]*?\n\s*\},/u.test(ruleFileContent);
  });

  expect(ruleFileNamesMissingGuidance).toEqual([]);
});
