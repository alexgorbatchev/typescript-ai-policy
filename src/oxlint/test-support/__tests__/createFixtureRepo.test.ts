import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createFixtureRepo } from "../createFixtureRepo.ts";

const REPOSITORY_TMP_DIRECTORY_PATH = process.env.POLICY_TEST_ROOT ?? resolve(import.meta.dir, "../../../..", ".tmp");

describe("createFixtureRepo", () => {
  it("creates fixture repos under the repository-local .tmp directory", () => {
    let fixtureRepositoryPath: string;
    {
      using fixtureRepository = createFixtureRepo("stories-directory-file-convention/invalid-stories-directory-file");
      fixtureRepositoryPath = fixtureRepository.path;

      const repositoryRoot = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], { cwd: fixtureRepositoryPath });
      expect(repositoryRoot.exitCode).toBe(0);
      expect(new TextDecoder().decode(repositoryRoot.stdout).trim()).toBe(fixtureRepositoryPath);

      expect(dirname(fixtureRepositoryPath)).toBe(REPOSITORY_TMP_DIRECTORY_PATH);
      expect(basename(fixtureRepositoryPath).slice(0, -6)).toBe(
        "typescript-ai-policy-stories-directory-file-convention-invalid-stories-directory-file-",
      );
    }
    expect(existsSync(fixtureRepositoryPath)).toBe(false);
  });
});
