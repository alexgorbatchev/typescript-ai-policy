import { expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { readSemanticFixRuntimePaths } from "../readSemanticFixRuntimePaths.ts";

const repositoryRootPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

it("resolves runtime paths from the installed package layout instead of the current working directory", async () => {
  const originalWorkingDirectoryPath = process.cwd();
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "semantic-fix-runtime-paths-"));

  try {
    process.chdir(tempDirectoryPath);

    expect(readSemanticFixRuntimePaths()).toEqual({
      oxlintConfigPath: resolve(repositoryRootPath, "src/oxlint/oxlint.config.ts"),
      oxlintExecutablePath: resolve(repositoryRootPath, "node_modules/oxlint/bin/oxlint"),
      tsgoExecutablePath: resolve(repositoryRootPath, "node_modules/@typescript/native-preview/bin/tsgo.js"),
    });
  } finally {
    process.chdir(originalWorkingDirectoryPath);
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});
