import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import { readPackageUsageNotice } from "../packageUsageNotice.ts";

type PackageMetadata = {
  name: string;
  version: string;
};

function readPackageMetadata(): PackageMetadata {
  const packageJsonPath = resolve(import.meta.dir, "../../../package.json");
  const packageJsonContent = readFileSync(packageJsonPath, "utf8");

  return JSON.parse(packageJsonContent) as PackageMetadata;
}

describe("readPackageUsageNotice", () => {
  it("includes the detected local package-manager command for guidance", () => {
    const packageMetadata = readPackageMetadata();

    expect(readPackageUsageNotice()).toBe(
      `${packageMetadata.name}@${packageMetadata.version} is being used, see 'bun x typescript-ai-policy guidance'\n`,
    );
  });
});
