import assert from "node:assert";
import { afterAll, describe, expect, it } from "bun:test";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { createFixtureRepo } from "../createFixtureRepo.ts";

const createdFixtureRepositoryPaths = new Set<string>();
const REPOSITORY_TMP_DIRECTORY_PATH = resolve(import.meta.dir, "../../../..", ".tmp");

afterAll(() => {
  createdFixtureRepositoryPaths.forEach((fixtureRepositoryPath) => {
    rmSync(fixtureRepositoryPath, { recursive: true, force: true });
  });
});

describe("createFixtureRepo", () => {
  it("creates fixture repos under the repository-local .tmp directory", () => {
    const fixtureRepositoryPath = createFixtureRepo("stories-directory-file-convention/invalid-stories-directory-file");
    createdFixtureRepositoryPaths.add(fixtureRepositoryPath);

    const repositoryRoot = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], { cwd: fixtureRepositoryPath });
    expect(repositoryRoot.exitCode).toBe(0);
    expect(new TextDecoder().decode(repositoryRoot.stdout).trim()).toBe(fixtureRepositoryPath);

    assert(fixtureRepositoryPath.startsWith(`${REPOSITORY_TMP_DIRECTORY_PATH}/`));
    expect(fixtureRepositoryPath).toContain(
      "typescript-ai-policy-stories-directory-file-convention-invalid-stories-directory-file-",
    );
  });
});
