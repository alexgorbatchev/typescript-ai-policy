import { beforeEach, describe, expect, it, onTestFinished } from "bun:test";
import { mkdirSync, mkdtempDisposableSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { runLintTargetFixture } from "../runLintTargetFixture.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../runLintTargetFixtureWithConsumerConfig.ts";

const REPOSITORY_TMP_DIRECTORY_PATH = process.env.POLICY_TEST_ROOT ?? resolve(import.meta.dir, "../../../..", ".tmp");
const VALID_FIXTURE = "fixture-import-path-convention/nested-test-valid-relative-fixtures";
let previousEntries: string[];

beforeEach(() => {
  mkdirSync(REPOSITORY_TMP_DIRECTORY_PATH, { recursive: true });
  previousEntries = readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort();
  onTestFinished(() => {
    readdirSync(REPOSITORY_TMP_DIRECTORY_PATH)
      .filter((entry) => !previousEntries.includes(entry))
      .filter((entry) => entry.startsWith("typescript-ai-policy-fixture-import-path-convention-"))
      .forEach((entry) => rmSync(join(REPOSITORY_TMP_DIRECTORY_PATH, entry), { recursive: true, force: true }));
  });
});

describe("lint fixture lifecycle", () => {
  it("removes a successful fixture before returning its lint result", () => {
    const result = runLintTargetFixture(VALID_FIXTURE);

    expect(result.exitCode).toBe(0);
    expect(result.issues).toEqual([]);
    expect(readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort()).toEqual(previousEntries);
  });

  it("removes a fixture when lint reports a policy violation", () => {
    const result = runLintTargetFixture("fixture-import-path-convention/aliased-fixture-import-in-test-invalid");

    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId)).toEqual(["@alexgorbatchev(fixture-import-path-convention)"]);
    expect(readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort()).toEqual(previousEntries);
  });

  it("removes a consumer-config fixture before returning its lint result", () => {
    const result = runLintTargetFixtureWithConsumerConfig(VALID_FIXTURE, {});

    expect(result.exitCode).toBe(0);
    expect(result.issues).toEqual([]);
    expect(readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort()).toEqual(previousEntries);
  });

  it("removes a fixture when consumer configuration serialization fails", () => {
    const settings: Record<string, unknown> = {};
    settings.circular = settings;

    expect(() => runLintTargetFixtureWithConsumerConfig(VALID_FIXTURE, settings)).toThrow(TypeError);
    expect(readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort()).toEqual(previousEntries);
  });

  it("removes a partially initialized repository when copying the fixture fails", () => {
    expect(() => runLintTargetFixture(`${VALID_FIXTURE}/src/accounts/UserRow.ts.txt`)).toThrow(Error);

    expect(readdirSync(REPOSITORY_TMP_DIRECTORY_PATH).sort()).toEqual(previousEntries);
  });

  it("keeps child-tool temporary files and Node caches out of inherited runtime directories", () => {
    using runtime = mkdtempDisposableSync(join(REPOSITORY_TMP_DIRECTORY_PATH, "lint-parent-runtime-"));
    const result = Bun.spawnSync(
      [
        process.execPath,
        "-e",
        `import assert from "node:assert/strict";
         import { readdirSync } from "node:fs";
         import { runLintTargetFixture } from ${JSON.stringify(resolve(import.meta.dir, "../runLintTargetFixture.ts"))};
         import { runLintTargetFixtureWithConsumerConfig } from ${JSON.stringify(resolve(import.meta.dir, "../runLintTargetFixtureWithConsumerConfig.ts"))};
         const before = readdirSync(process.env.TMPDIR, { recursive: true }).sort();
         runLintTargetFixture(${JSON.stringify(VALID_FIXTURE)});
         runLintTargetFixtureWithConsumerConfig(${JSON.stringify(VALID_FIXTURE)}, {});
         assert.deepEqual(readdirSync(process.env.TMPDIR, { recursive: true }).sort(), before);`,
      ],
      {
        env: {
          ...process.env,
          TMPDIR: runtime.path,
          NODE_COMPILE_CACHE: join(runtime.path, "node-compile-cache"),
          NODE_DISABLE_COMPILE_CACHE: undefined,
        },
        stderr: "pipe",
        stdout: "pipe",
      },
    );

    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  });
});
