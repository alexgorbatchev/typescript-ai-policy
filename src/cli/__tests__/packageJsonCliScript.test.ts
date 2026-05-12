import { expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type PackageJsonScripts = {
  cli?: string;
};

type PackageJson = {
  scripts?: PackageJsonScripts;
};

function readPackageJson(): PackageJson {
  const packageJsonPath = resolve(import.meta.dir, "../../../package.json");
  const packageJsonContent = readFileSync(packageJsonPath, "utf8");

  return JSON.parse(packageJsonContent) as PackageJson;
}

it("defines a root-level script for the package CLI", () => {
  const packageJson = readPackageJson();

  expect(packageJson.scripts?.cli).toBe("bun src/cli/runTypescriptAiPolicyCliMain.ts");
});
