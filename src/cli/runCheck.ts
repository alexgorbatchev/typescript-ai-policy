type EnvironmentVariables = Record<string, string | undefined>;

type CheckRunner = (command: readonly string[]) => Promise<void>;

type RunCheckDependencies = {
  env: EnvironmentVariables;
  runCommand: CheckRunner;
};

const DEFAULT_RUN_CHECK_DEPENDENCIES: RunCheckDependencies = {
  env: process.env,
  async runCommand(command: readonly string[]): Promise<void> {
    const checkProcess = Bun.spawn({
      cmd: [...command],
      stdin: "inherit",
      stderr: "inherit",
      stdout: "inherit",
    });
    const exitCode = await checkProcess.exited;

    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${String(exitCode)}: ${command.join(" ")}`);
    }
  },
};

function readOxfmtCheckCommand(): readonly string[] {
  return ["bun", "--bun", "oxfmt", "--check", "."];
}

function readOxlintCheckCommand(env: EnvironmentVariables): readonly string[] {
  if (env.AGENT === "1") {
    return ["bun", "--bun", "oxlint", "--format", "unix", "."];
  }

  return ["bun", "--bun", "oxlint", "."];
}

export async function runCheck(dependencies: RunCheckDependencies = DEFAULT_RUN_CHECK_DEPENDENCIES): Promise<void> {
  await dependencies.runCommand(readOxfmtCheckCommand());
  await dependencies.runCommand(readOxlintCheckCommand(dependencies.env));
}
