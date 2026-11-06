import assert from "node:assert/strict";
import { lstat, mkdir, mkdtempDisposable, symlink, type DisposableTempDir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runTestCommand } from "../runTestCommand.ts";
import { fixture_checkoutOxfmtConfig, fixture_checkoutOxlintConfig, fixture_checkoutPlugin } from "./fixtures";

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");

export async function runFixtureGit(root: string, args: string[]): Promise<void> {
  const result = await runTestCommand(["git", "-c", "maintenance.auto=false", ...args], {
    cwd: root,
    timeout: 10000,
  });
  assert.equal(result.exitCode, 0, result.stderr ?? "Git command failed");
  assert.equal(result.timedOut, false);
}

export async function initializeGit(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await runFixtureGit(root, ["init", "--quiet", "--initial-branch=main"]);
}

export async function createCheckoutFixture(): Promise<DisposableTempDir> {
  await mkdir(TEST_ROOT, { recursive: true });
  const directory = await mkdtempDisposable(join(TEST_ROOT, "checkout recipe-"));
  try {
    const root = directory.path;
    await initializeGit(root);
    await Bun.write(join(root, ".gitignore"), "node_modules\n");
    await Bun.write(join(root, ".git", "fixture-global-ignore"), ".workspaces/\n");
    await runFixtureGit(root, ["config", "core.excludesFile", join(root, ".git", "fixture-global-ignore")]);
    await Bun.write(join(root, "package.json"), '{"type":"module"}\n');
    await Bun.write(join(root, "plugin.mjs"), fixture_checkoutPlugin);
    await Bun.write(join(root, "oxlint.config.ts"), fixture_checkoutOxlintConfig);
    await Bun.write(join(root, "oxfmt.config.ts"), fixture_checkoutOxfmtConfig);
    await Bun.write(join(root, "tracked.ts"), 'export const tracked = "owned";\n');
    for (const file of ["justfile", "scripts/readCheckoutFiles.ts", "scripts/runCheckoutTool.ts"]) {
      await Bun.write(join(root, file), Bun.file(resolve(file)));
    }
    await symlink(resolve("node_modules"), join(root, "node_modules"), "dir");
    const formatted = await runTestCommand(
      [process.execPath, resolve("node_modules/oxfmt/bin/oxfmt"), "--write", "."],
      { cwd: root, timeout: 10000 },
    );
    assert.equal(formatted.exitCode, 0, formatted.stderr ?? "Fixture formatting failed");
    await runFixtureGit(root, ["add", "."]);
    const foreign = join(root, ".workspaces", "independent checkout");
    await initializeGit(foreign);
    await Bun.write(join(foreign, "package.json"), '{"type":"module"}\n');
    await Bun.write(join(foreign, "plugin.mjs"), fixture_checkoutPlugin);
    await Bun.write(join(foreign, "oxlint.config.ts"), fixture_checkoutOxlintConfig);
    await Bun.write(join(foreign, "oxfmt.config.ts"), fixture_checkoutOxfmtConfig);
    await Bun.write(join(foreign, "foreign.ts"), 'debugger;\nexport const foreign="preserve"\n');
    return directory;
  } catch (error) {
    await directory.remove();
    throw error;
  }
}

export function runCheckoutRecipe(root: string, recipe: string): ReturnType<typeof runTestCommand> {
  return runTestCommand(["just", recipe], {
    cwd: root,
    timeout: 20000,
    env: { NO_COLOR: "1", FORCE_COLOR: undefined, LC_ALL: "C", LANG: "C" },
  });
}

export async function snapshotFiles(root: string): Promise<Record<string, string>> {
  const paths = [...new Bun.Glob("**/*").scanSync({ cwd: root, dot: true, onlyFiles: true })].sort();
  const result: Record<string, string> = {};
  for (const path of paths) {
    const absolute = join(root, path);
    if ((await lstat(absolute)).isFile()) {
      result[path] = new Bun.CryptoHasher("sha256").update(await Bun.file(absolute).bytes()).digest("hex");
    }
  }
  return result;
}
