import { expect, test } from "bun:test";
import { mkdir, mkdtempDisposable, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readCheckoutFiles } from "../readCheckoutFiles.ts";
import { initializeGit, runFixtureGit } from "./helpers";

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");

test("selects tracked and new nonignored regular files with literal pathnames", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "checkout-inventory-"));
  await initializeGit(directory.path);
  for (const file of ["tracked-ignored.ts", "deleted.ts", "changed-to-directory.ts", "ancestor/child.ts"]) {
    await Bun.write(join(directory.path, file), "export const value = 1;\n");
  }
  await runFixtureGit(directory.path, ["add", "."]);
  await Bun.write(join(directory.path, ".gitignore"), "tracked-ignored.ts\nignored.ts\nforeign/\n");
  await Bun.write(join(directory.path, "ignored.ts"), "ignored\n");
  for (const file of ["new dir/with spaces.ts", "-option.ts", "!prefix.ts", "[literal].ts", "with\nnewline.ts"]) {
    await Bun.write(join(directory.path, file), "export const value = 1;\n");
  }
  await Bun.file(join(directory.path, "deleted.ts")).delete();
  await Bun.file(join(directory.path, "changed-to-directory.ts")).delete();
  await mkdir(join(directory.path, "changed-to-directory.ts"));
  await rm(join(directory.path, "ancestor"), { recursive: true });
  await Bun.write(join(directory.path, "ancestor"), "directory replaced by an owned regular file\n");
  await initializeGit(join(directory.path, "foreign"));
  await Bun.write(join(directory.path, "foreign", "ignored-child.ts"), "foreign\n");
  await initializeGit(join(directory.path, "independent"));
  await Bun.write(join(directory.path, "independent", "foreign-child.ts"), "foreign\n");

  expect(await readCheckoutFiles(directory.path)).toEqual([
    "./!prefix.ts",
    "./-option.ts",
    "./.gitignore",
    "./[literal].ts",
    "./ancestor",
    "./new dir/with spaces.ts",
    "./tracked-ignored.ts",
    "./with\nnewline.ts",
  ]);
});

test("rejects a symbolic-link file without reading its external target", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "checkout-file-link-"));
  const root = join(directory.path, "repo");
  await initializeGit(root);
  await Bun.write(join(directory.path, "external.ts"), "external content\n");
  await symlink(join(directory.path, "external.ts"), join(root, "linked.ts"));

  await expect(readCheckoutFiles(root)).rejects.toThrow("Symbolic links are unsupported in checkout checks: linked.ts");
  expect(await Bun.file(join(directory.path, "external.ts")).text()).toBe("external content\n");
});

test("rejects a tracked path below a directory replaced by a symbolic link", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "checkout-directory-link-"));
  const root = join(directory.path, "repo");
  await initializeGit(root);
  await Bun.write(join(root, "parent", "child.ts"), "tracked\n");
  await runFixtureGit(root, ["add", "."]);
  await Bun.write(join(root, ".gitignore"), "parent\n");
  await rm(join(root, "parent"), { recursive: true });
  await mkdir(join(directory.path, "external"));
  await Bun.write(join(directory.path, "external", "child.ts"), "external content\n");
  await symlink(join(directory.path, "external"), join(root, "parent"), "dir");

  await expect(readCheckoutFiles(root)).rejects.toThrow(
    "Symbolic links are unsupported in checkout checks: parent/child.ts",
  );
  expect(await Bun.file(join(directory.path, "external", "child.ts")).text()).toBe("external content\n");
});

test("requires the owning root instead of silently restricting files to a subdirectory", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "checkout-subdirectory-"));
  await initializeGit(directory.path);
  await mkdir(join(directory.path, "nested"));

  await expect(readCheckoutFiles(join(directory.path, "nested"))).rejects.toThrow(
    "Run checkout checks from the Git checkout root",
  );
});
