import { execa, type Options } from "execa";
import { mkdir, mkdtempDisposable } from "node:fs/promises";
import { join, resolve } from "node:path";

interface ITestCommandOptions extends Pick<Options, "cwd" | "env" | "cancelSignal" | "timeout"> {
  stdio?: "pipe" | "inherit";
}

export async function runTestCommand(command: string[], options: ITestCommandOptions = {}) {
  const [file, ...args] = command;
  if (!file) throw new Error("A test command is required");
  const root = options.env?.POLICY_TEST_ROOT ?? process.env.POLICY_TEST_ROOT ?? resolve(".tmp");
  await mkdir(root, { recursive: true });
  await using directory = await mkdtempDisposable(join(root, "command-"));
  const temporary = join(directory.path, "tmp");
  await mkdir(temporary);
  return await execa(file, args, {
    ...options,
    // Retain owned pipes through worker shutdown while forwarding live output.
    stdio: options.stdio === "inherit" ? ["inherit", ["pipe", "inherit"], ["pipe", "inherit"]] : options.stdio,
    buffer: options.stdio !== "inherit",
    stripFinalNewline: false,
    reject: false,
    killDescendants: true,
    env: {
      ...options.env,
      POLICY_TEST_ROOT: directory.path,
      TMPDIR: temporary,
      TMP: temporary,
      TEMP: temporary,
      NODE_COMPILE_CACHE: join(directory.path, "node-cache"),
      NODE_DISABLE_COMPILE_CACHE: undefined,
      npm_config_logs_dir: join(directory.path, "npm-logs"),
    },
  });
}
