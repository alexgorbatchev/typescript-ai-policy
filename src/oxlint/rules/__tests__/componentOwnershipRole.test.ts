import { describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  isRuntimeComponentOwnershipFile,
  readComponentOwnershipRole,
} from "../componentOwnership/componentOwnershipRole.ts";
import { readNearestPackageRootPath } from "../helpers.ts";
import { createStoryOwnershipFixture } from "./helpers.ts";

describe("package-relative component ownership roles", () => {
  it("observes a new or removed nearest package during one process", () => {
    using repository = createStoryOwnershipFixture({ "src/components/feature/Button.tsx": "export const Button = 1;" });
    const filename = join(repository.path, "src/components/feature/Button.tsx");
    const packagePath = join(repository.path, "src/components/feature");
    expect(readNearestPackageRootPath(filename)).toBe(repository.path);
    writeFileSync(join(packagePath, "package.json"), '{"name":"nested"}');
    expect(readNearestPackageRootPath(filename)).toBe(packagePath);
    expect(readComponentOwnershipRole(filename)).toBeNull();
    rmSync(join(packagePath, "package.json"));
    expect(readNearestPackageRootPath(filename)).toBe(repository.path);
    expect(isRuntimeComponentOwnershipFile(filename)).toBe(true);
  });

  it.each([
    ["src/components/feature/Button.tsx", true],
    ["src/accounts/components/Button.tsx", true],
    ["src/layouts/Page.tsx", true],
    ["src/templates/Page.tsx", true],
    ["src/components/index.tsx", false],
    ["src/components/types.tsx", false],
    ["src/components/Button.test.tsx", false],
    ["src/components/Button.spec.tsx", false],
    ["src/components/Button.stories.tsx", false],
    ["src/components/Button.ts", false],
    ["src/components/fixtures/Button.tsx", false],
    ["src/components/__fixtures__/Button.tsx", false],
    ["src/components/hooks/Button.tsx", false],
    ["src/components/__tests__/Button.tsx", false],
    ["src/components/stories/Button.tsx", false],
    ["src/components/node_modules/Button.tsx", false],
    ["src/Button.tsx", false],
  ])("classifies %s within its package", (filename, expected) => {
    using repository = createStoryOwnershipFixture({ [filename]: "export const value = 1;" });
    expect(isRuntimeComponentOwnershipFile(join(repository.path, filename))).toBe(expected);
  });
});
