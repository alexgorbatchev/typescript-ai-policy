import { describe, expect, it } from "bun:test";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFixtureRepo } from "../test-support/createFixtureRepo.ts";
import { expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTarget } from "../test-support/runLintTarget.ts";

const GRAPH_FIXTURE = "no-fixture-exports-outside-fixture-entrypoint/owned-barrel-graph";
const TEST_BARREL = "src/accounts/__tests__/fixtures/index.ts";
const STORY_BARREL = "src/accounts/components/stories/fixtures/index.ts";
const FIXTURE_RULE = "@alexgorbatchev(no-fixture-exports-outside-fixture-entrypoint)";

describe("owned fixture barrel policy integration", () => {
  it("allows typed declaration owners, named barrels, and unaliased test and story consumers together", () => {
    using repository = createFixtureRepo(GRAPH_FIXTURE);

    expectLintTargetSuccess(runLintTarget(repository.path));
  });

  it.each([
    ['export { fixture_rows } from "./fixtures";\nexport { factory_rows } from "./nested/fixtures";\n'],
    ['export * from "./fixtures";\nexport * from "./nested/fixtures";\n'],
  ])("allows extensionless declaration files in test and story graphs: %s", (source) => {
    using repository = createFixtureRepo(GRAPH_FIXTURE);
    writeFileSync(join(repository.path, TEST_BARREL), source);
    writeFileSync(join(repository.path, STORY_BARREL), source);

    expectLintTargetSuccess(runLintTarget(repository.path));
  });

  it("keeps index.tsx forbidden for fixture barrels", () => {
    using repository = createFixtureRepo(GRAPH_FIXTURE);
    renameSync(join(repository.path, TEST_BARREL), join(repository.path, `${TEST_BARREL}x`));

    const result = runLintTarget(repository.path);

    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      "@alexgorbatchev(index-file-contract)",
      FIXTURE_RULE,
      FIXTURE_RULE,
    ]);
  });

  it.each(['export * from "./other/fixtures";', 'export { fixture_rows } from "./other/fixtures";'])(
    "rejects an extensionless directory barrel target: %s",
    (source) => {
      using repository = createFixtureRepo(GRAPH_FIXTURE);
      const nestedDirectory = join(repository.path, "src/accounts/__tests__/fixtures/other/fixtures");
      mkdirSync(nestedDirectory, { recursive: true });
      writeFileSync(
        join(nestedDirectory, "fixtures.ts"),
        'import type { Row } from "../../../../Row.ts";\nexport const fixture_rows: Row[] = [];\n',
      );
      writeFileSync(join(nestedDirectory, "index.ts"), 'export { fixture_rows } from "./fixtures.ts";\n');
      writeFileSync(join(repository.path, TEST_BARREL), `${source}\n`);

      const result = runLintTarget(repository.path);

      expect(result.exitCode).toBe(1);
      expect(result.issues.map((issue) => issue.ruleId)).toEqual([FIXTURE_RULE]);
    },
  );

  it("rejects an extensionless file that shadows the declaration owner", () => {
    using repository = createFixtureRepo(GRAPH_FIXTURE);
    writeFileSync(join(repository.path, "src/accounts/__tests__/fixtures/fixtures"), "export default [];\n");
    writeFileSync(join(repository.path, TEST_BARREL), 'export * from "./fixtures";\n');

    const result = runLintTarget(repository.path);

    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId)).toEqual([FIXTURE_RULE]);
  });

  it.each([
    ["src/accounts/index.ts", 'export * from "./components/stories/fixtures";', [FIXTURE_RULE]],
    ["src/accounts/index.ts", 'export { fixture_rows } from "./components/stories/fixtures";', [FIXTURE_RULE]],
    ["src/accounts/__tests__/helpers.ts", 'export * from "./fixtures";', [FIXTURE_RULE]],
    ["src/accounts/__tests__/helpers.ts", 'export { fixture_rows } from "./fixtures";', [FIXTURE_RULE]],
    ["src/accounts/__tests__/fixtures/helpers.ts", 'export * from "./fixtures.ts";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export * from "../../components/stories/fixtures";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export { fixture_rows } from "../../components/stories/fixtures";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export { fixture_rows as factory_rows } from "./fixtures.ts";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export * as rows from "./fixtures.ts";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export * from ".";', [FIXTURE_RULE]],
    [TEST_BARREL, 'export { fixture_rows } from "./";', [FIXTURE_RULE]],
    [TEST_BARREL, "export default [];", ["@alexgorbatchev(index-file-contract)"]],
    [TEST_BARREL, "export const fixture_rows = [];", [FIXTURE_RULE, "@alexgorbatchev(index-file-contract)"]],
    [
      "src/accounts/__tests__/fixtures/fixtures.ts",
      "export const fixture_rows = [];",
      ["@alexgorbatchev(fixture-export-type-contract)"],
    ],
  ])("rejects a forbidden fixture edge or barrel statement in %s: %s", (path, source, ruleIds) => {
    using repository = createFixtureRepo(GRAPH_FIXTURE);
    writeFileSync(join(repository.path, path), `${source}\n`);

    const result = runLintTarget(repository.path);

    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([...ruleIds].sort());
  });
});
