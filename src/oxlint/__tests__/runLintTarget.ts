import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";

export type LintTargetResult = {
  exitCode: number;
  output: string;
};

const OUTPUT_TEXT_DECODER = new TextDecoder();
const REPOSITORY_ROOT_PATH = resolve(import.meta.dir, "../../..");
const LINT_TARGET_SCRIPT_PATH = join(REPOSITORY_ROOT_PATH, "scripts", "lint-target.sh");

function decodeProcessOutput(output: Uint8Array): string {
  return OUTPUT_TEXT_DECODER.decode(output).replace(/\r\n/gu, "\n");
}

function normalizeLintTargetOutput(output: string, fixtureRepositoryPath: string): string {
  const canonicalFixtureRepositoryPath = realpathSync.native(fixtureRepositoryPath);

  return output
    .replaceAll(REPOSITORY_ROOT_PATH, "<repo-root>")
    .replaceAll(canonicalFixtureRepositoryPath, "<fixture-root>")
    .replaceAll(fixtureRepositoryPath, "<fixture-root>")
    .replace(
      /Finished in \d+ms on \d+ files? with \d+ rules using \d+ threads?\./u,
      "Finished in <duration> on <file-count> files with <rule-count> rules using <thread-count> threads.",
    )
    .trimEnd();
}

export function runLintTarget(fixtureRepositoryPath: string): LintTargetResult {
  const lintTargetProcess = Bun.spawnSync({
    cmd: ["bash", LINT_TARGET_SCRIPT_PATH, fixtureRepositoryPath],
    cwd: REPOSITORY_ROOT_PATH,
    stderr: "pipe",
    stdout: "pipe",
  });

  const output = `${decodeProcessOutput(lintTargetProcess.stdout)}${decodeProcessOutput(lintTargetProcess.stderr)}`;

  return {
    exitCode: lintTargetProcess.exitCode,
    output: normalizeLintTargetOutput(output, fixtureRepositoryPath),
  };
}
