import { expect, test } from "bun:test";
import { execa } from "execa";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtempDisposable, readdir, stat, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runTestCommand } from "../runTestCommand.ts";
import {
  fixture_artifactWriter,
  fixture_completedTest,
  fixture_processTree,
  fixture_timedOutTest,
  fixture_waitingTest,
} from "./fixtures";

interface IProcessReceipt {
  role: string;
  pid: number;
  scratch: string;
  fixture: string;
  consumerRoot: string;
}

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");
const FACTORY_PATH = resolve("src/oxlint/test-support/createFixtureRepo.ts");

test.each([
  { outcome: "success", suffix: '\nexport const buildCheckProbe = "changed";\n', exitCode: 0 },
  { outcome: "failure", suffix: "\nexport const = ;\n", exitCode: 1 },
])(
  "build validation preserves existing package output after $outcome",
  async ({ suffix, exitCode }) => {
    await using directory = await mkdtempDisposable(join(TEST_ROOT, "build-check regression-"));
    await cp(resolve("src"), join(directory.path, "src"), { recursive: true });
    for (const path of ["justfile", "package.json", "tsconfig.json", "tsdown.config.ts", "scripts/constants.ts"]) {
      await Bun.write(join(directory.path, path), Bun.file(resolve(path)));
    }
    await symlink(resolve("node_modules"), join(directory.path, "node_modules"), "dir");
    const options = { cwd: directory.path, timeout: 20000, killDescendants: true, reject: false };
    expect(await execa("just", ["build"], options)).toMatchObject({ exitCode: 0, timedOut: false });
    const outputPath = join(directory.path, "dist");
    await Bun.write(join(outputPath, ".retained", "caller.txt"), "caller-owned output\n");
    const outputEntries = (await readdir(outputPath, { recursive: true })).sort();
    const outputFiles = await Array.fromAsync(
      new Bun.Glob("**/*").scan({ cwd: outputPath, dot: true, onlyFiles: true }),
    );
    const contents = await Promise.all(
      outputFiles.map(async (path) => ({ path, bytes: await Bun.file(join(outputPath, path)).bytes() })),
    );
    const sourcePath = join(directory.path, "src/oxfmt/createOxfmtConfig.ts");
    await Bun.write(sourcePath, (await Bun.file(sourcePath).text()) + suffix);

    expect(await execa("just", ["build-check"], options)).toMatchObject({ exitCode, timedOut: false });

    expect((await readdir(outputPath, { recursive: true })).sort()).toEqual(outputEntries);
    for (const { path, bytes } of contents) expect(await Bun.file(join(outputPath, path)).bytes()).toEqual(bytes);
  },
  30000,
);

test.each([0, 7])("test commands preserve caller artifacts and remove owned output after exit %s", async (exitCode) => {
  await mkdir(TEST_ROOT, { recursive: true });
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "command-regression-"));
  await mkdir(join(directory.path, "caller-runtime"));
  await Bun.write(join(directory.path, "scratch", "unowned.txt"), "preserve");
  const result = await runTestCommand(
    [process.execPath, "--eval", await fixture_artifactWriter.text(), String(exitCode)],
    {
      env: {
        POLICY_TEST_ROOT: join(directory.path, "scratch"),
        TMPDIR: join(directory.path, "caller-runtime"),
        NODE_COMPILE_CACHE: join(directory.path, "caller-runtime", "node-cache"),
        npm_config_logs_dir: join(directory.path, "caller-runtime", "npm-logs"),
      },
    },
  );

  expect(result).toMatchObject({ exitCode, stdout: "written\n" });
  expect(await readdir(join(directory.path, "caller-runtime"))).toEqual([]);
  expect(await readdir(join(directory.path, "scratch"))).toEqual(["unowned.txt"]);
  expect(await Bun.file(join(directory.path, "scratch", "unowned.txt")).text()).toBe("preserve");
});

test.each(["cancel", "timeout"])(
  "%s joins descendants before disposing their live fixtures",
  async (reason) => {
    await using directory = await mkdtempDisposable(join(TEST_ROOT, "process-regression-"));
    await Bun.write(join(directory.path, "tree.ts"), fixture_processTree);
    const receipts = new Map<string, IProcessReceipt>();
    const readiness = new Map(["parent", "child"].map((role) => [role, Promise.withResolvers<void>()]));
    await using server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        const entry = (await request.json()) as IProcessReceipt;
        receipts.set(entry.role, entry);
        readiness.get(entry.role)?.resolve();
        return new Response("ready");
      },
    });
    const controller = new AbortController();
    const running = runTestCommand(
      [process.execPath, join(directory.path, "tree.ts"), "parent", server.url.href, directory.path],
      {
        env: { POLICY_TEST_ROOT: directory.path, FIXTURE_FACTORY_URL: FACTORY_PATH },
        cancelSignal: controller.signal,
        timeout: 2000,
      },
    );
    try {
      await Promise.race([Promise.all([...readiness.values()].map((entry) => entry.promise)), running]);
      expect(receipts.size).toBe(2);
      for (const receipt of receipts.values()) expect((await stat(receipt.fixture)).isDirectory()).toBe(true);
      const actions = new Map([
        ["cancel", () => controller.abort()],
        ["timeout", () => {}],
      ]);
      actions.get(reason)?.();
      expect(await running).toMatchObject({
        failed: true,
        isCanceled: reason === "cancel",
        timedOut: reason === "timeout",
      });
      expect(await Bun.file(join(directory.path, "parent")).text()).toBe("terminated");
      expect(await Bun.file(join(directory.path, "child")).text()).toBe("terminated");
      for (const receipt of receipts.values()) {
        expect(() => process.kill(receipt.pid, 0)).toThrow();
        await expect(stat(receipt.scratch)).rejects.toMatchObject({ code: "ENOENT" });
        await expect(stat(receipt.fixture)).rejects.toMatchObject({ code: "ENOENT" });
      }
    } finally {
      controller.abort();
      await running;
    }
  },
  10000,
);

test.each(["SIGINT", "SIGTERM"])(
  "test entrypoint cleans active synchronous workers after %s",
  async (signal) => {
    await using directory = await mkdtempDisposable(join(TEST_ROOT, "runner-regression-"));
    await Bun.write(join(directory.path, "tree.ts"), fixture_processTree);
    await Bun.write(join(directory.path, "waiter.test.ts"), fixture_waitingTest);
    await Bun.write(join(directory.path, "scratch", "unowned.txt"), "preserve");
    const receipts = new Map<string, IProcessReceipt>();
    const readiness = new Map(["parent", "child"].map((role) => [role, Promise.withResolvers<void>()]));
    await using server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        const entry = (await request.json()) as IProcessReceipt;
        receipts.set(entry.role, entry);
        readiness.get(entry.role)?.resolve();
        return new Response("ready");
      },
    });
    const runner = execa(process.execPath, [resolve("scripts/runTests.ts"), join(directory.path, "waiter.test.ts")], {
      env: {
        POLICY_TEST_ROOT: join(directory.path, "scratch"),
        POLICY_CONSUMER_ROOT: directory.path,
        FIXTURE_FACTORY_URL: FACTORY_PATH,
        FIXTURE_TREE_PATH: join(directory.path, "tree.ts"),
        FIXTURE_READY_URL: server.url.href,
        FIXTURE_EVIDENCE_PATH: directory.path,
      },
      timeout: 7000,
      killDescendants: true,
      reject: false,
    });
    try {
      await Promise.race([Promise.all([...readiness.values()].map((entry) => entry.promise)), runner]);
      assert.equal(receipts.size, 2);
      runner.kill(signal);
      const exitCodes: Record<string, number> = { SIGINT: 130, SIGTERM: 143 };
      expect(await runner).toMatchObject({ exitCode: exitCodes[signal], timedOut: false });
      expect(await readdir(join(directory.path, "scratch"))).toEqual(["unowned.txt"]);
      for (const receipt of receipts.values()) {
        expect(() => process.kill(receipt.pid, 0)).toThrow();
        await expect(stat(receipt.consumerRoot)).rejects.toMatchObject({ code: "ENOENT" });
      }
    } finally {
      runner.kill();
      await runner;
    }
  },
  10000,
);

test.each([
  { outcome: "pass", exitCode: 0, source: fixture_completedTest },
  { outcome: "fail", exitCode: 1, source: fixture_completedTest },
  { outcome: "timeout", exitCode: 1, source: fixture_timedOutTest },
])(
  "declared test command cleans fixtures and preserves inherited caches after $outcome",
  async ({ outcome, exitCode, source }) => {
    await using directory = await mkdtempDisposable(join(TEST_ROOT, "recipe regression-"));
    await Bun.write(join(directory.path, "lifecycle.test.ts"), source);
    await mkdir(join(directory.path, "caller-runtime"));
    await Bun.write(join(directory.path, "scratch", "unowned.txt"), "preserve");
    const result = await execa("just", ["test", join(directory.path, "lifecycle.test.ts")], {
      env: {
        POLICY_TEST_ROOT: join(directory.path, "scratch"),
        POLICY_CONSUMER_ROOT: directory.path,
        TMPDIR: join(directory.path, "caller-runtime"),
        NODE_COMPILE_CACHE: join(directory.path, "caller-runtime", "node-cache"),
        NODE_DISABLE_COMPILE_CACHE: undefined,
        npm_config_logs_dir: join(directory.path, "caller-runtime", "npm-logs"),
        FIXTURE_FACTORY_URL: FACTORY_PATH,
        FIXTURE_OUTCOME: outcome,
        FIXTURE_CONSUMER_RECEIPT: join(directory.path, "consumer-root.txt"),
      },
      timeout: 5000,
      killDescendants: true,
      reject: false,
    });

    expect(result).toMatchObject({ exitCode, timedOut: false });
    expect(await readdir(join(directory.path, "caller-runtime"))).toEqual([]);
    expect(await readdir(join(directory.path, "scratch"))).toEqual(["unowned.txt"]);
    const consumerRoot = await Bun.file(join(directory.path, "consumer-root.txt")).text();
    await expect(stat(consumerRoot)).rejects.toMatchObject({ code: "ENOENT" });
  },
  10000,
);
