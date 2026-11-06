import { expect, test } from "bun:test";
import { mkdtempDisposable } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runCheckoutTool } from "../runCheckoutTool.ts";
import { runTestCommand } from "../runTestCommand.ts";
import { createCheckoutFixture, initializeGit, runCheckoutRecipe, runFixtureGit, snapshotFiles } from "./helpers";

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");

test.each(["lint", "fmt-check", "fmt", "fix"])(
  "real %s recipe preserves an ignored independent checkout and its second plugin",
  async (recipe) => {
    await using fixture = await createCheckoutFixture();
    const before = await snapshotFiles(fixture.path);
    const result = await runCheckoutRecipe(fixture.path, recipe);

    expect(result).toMatchObject({ exitCode: 0, timedOut: false });
    expect(await snapshotFiles(fixture.path)).toEqual(before);
  },
  30000,
);

test.each(["tracked.ts", "new dir/new file.ts", "tracked-ignored.ts"])(
  "reports an owning checkout violation in %s and preserves both checkouts",
  async (file) => {
    await using fixture = await createCheckoutFixture();
    await Bun.write(join(fixture.path, "tracked-ignored.ts"), 'export const ignored = "tracked";\n');
    await runFixtureGit(fixture.path, ["add", "--", "tracked-ignored.ts"]);
    await Bun.write(join(fixture.path, ".gitignore"), "node_modules\ntracked-ignored.ts\n");
    await Bun.write(join(fixture.path, file), "debugger;\n");
    const before = await snapshotFiles(fixture.path);
    const result = await runTestCommand(
      [process.execPath, "scripts/runCheckoutTool.ts", "oxlint", "--deny-warnings", "--format=json"],
      { cwd: fixture.path, timeout: 20000 },
    );
    const output = JSON.parse(result.stdout ?? "");

    expect(result).toMatchObject({ exitCode: 1, timedOut: false });
    expect(output.diagnostics).toEqual([
      {
        message: "Remove the fixture debugger statement.",
        code: "fixture(no-debugger)",
        severity: "error",
        filename: file,
        labels: [{ span: { offset: 0, length: 9, line: 1, column: 1 } }],
      },
    ]);
    expect(await snapshotFiles(fixture.path)).toEqual(before);
  },
  30000,
);

test("real lint recipe selects an owning nested configuration instead of the root plugin", async () => {
  await using fixture = await createCheckoutFixture();
  await Bun.write(
    join(fixture.path, "new dir", "oxlint.config.ts"),
    'export default { rules: { "no-debugger": "off" } };\n',
  );
  await Bun.write(join(fixture.path, "new dir", "allowed.ts"), "debugger;\n");
  const before = await snapshotFiles(fixture.path);

  expect(await runCheckoutRecipe(fixture.path, "lint")).toMatchObject({ exitCode: 0, timedOut: false });
  expect(await snapshotFiles(fixture.path)).toEqual(before);
});

test("real fmt recipe formats tracked ignored and new files using their owning nested configs", async () => {
  await using fixture = await createCheckoutFixture();
  const foreign = join(fixture.path, ".workspaces");
  const before = await snapshotFiles(foreign);
  await Bun.write(join(fixture.path, "tracked-ignored.ts"), 'export const value="owned"\n');
  await runFixtureGit(fixture.path, ["add", "--", "tracked-ignored.ts"]);
  await Bun.write(join(fixture.path, ".gitignore"), "node_modules\ntracked-ignored.ts\n");
  await Bun.write(
    join(fixture.path, "new dir", "oxfmt.config.ts"),
    "export default { semi: false, singleQuote: true };\n",
  );
  await Bun.write(join(fixture.path, "new dir", "with spaces.ts"), 'export const value="new";\n');

  expect(await runCheckoutRecipe(fixture.path, "fmt")).toMatchObject({ exitCode: 0, timedOut: false });
  expect(await Bun.file(join(fixture.path, "tracked-ignored.ts")).text()).toBe('export const value = "owned";\n');
  expect(await Bun.file(join(fixture.path, "new dir", "with spaces.ts")).text()).toBe("export const value = 'new'\n");
  expect(await snapshotFiles(foreign)).toEqual(before);
  expect(await runCheckoutRecipe(fixture.path, "fmt-check")).toMatchObject({ exitCode: 0, timedOut: false });
});

test("real fix recipe applies owning lint fixes and formatting without modifying the independent checkout", async () => {
  await using fixture = await createCheckoutFixture();
  const foreign = join(fixture.path, ".workspaces");
  const before = await snapshotFiles(foreign);
  await Bun.write(join(fixture.path, "tracked.ts"), 'let value="owned"\nexport {value}\n');

  expect(await runCheckoutRecipe(fixture.path, "fix")).toMatchObject({ exitCode: 0, timedOut: false });
  expect(await Bun.file(join(fixture.path, "tracked.ts")).text()).toBe('const value = "owned";\nexport { value };\n');
  expect(await snapshotFiles(foreign)).toEqual(before);
  expect(await runCheckoutRecipe(fixture.path, "lint")).toMatchObject({ exitCode: 0, timedOut: false });
});

test.each([{ args: [] }, { args: ["eslint"] }])(
  "rejects unsupported checkout tool arguments $args",
  async ({ args }) => {
    await expect(runCheckoutTool(TEST_ROOT, args)).rejects.toThrow("Expected the oxlint or oxfmt checkout tool");
  },
);

test("fails an empty checkout before a tool can fall back to traversing its directory", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "empty-checkout-"));
  await initializeGit(directory.path);

  await expect(runCheckoutTool(directory.path, ["oxlint"])).rejects.toThrow("No regular files belong to this checkout");
});

test("entrypoint reports invalid tool arguments with a failing status", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "invalid-checkout-tool-"));
  const result = await runTestCommand([process.execPath, resolve("scripts/runCheckoutTool.ts"), "eslint"], {
    cwd: directory.path,
    timeout: 10000,
  });

  expect(result).toMatchObject({ exitCode: 1, stdout: "", stderr: "Expected the oxlint or oxfmt checkout tool\n" });
});

test("entrypoint propagates a Git discovery failure without falling back to directory traversal", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "outside-checkout-"));
  const result = await runTestCommand([process.execPath, resolve("scripts/runCheckoutTool.ts"), "oxlint"], {
    cwd: directory.path,
    timeout: 10000,
    env: { GIT_CEILING_DIRECTORIES: TEST_ROOT, LC_ALL: "C", LANG: "C" },
  });

  expect(result).toMatchObject({
    exitCode: 1,
    stdout: "",
    stderr:
      "Command failed with exit code 128: git rev-parse --show-prefix\n\nfatal: not a git repository (or any of the parent directories): .git\n",
  });
});
