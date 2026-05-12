import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createFixtureRepo } from "./createFixtureRepo.ts";
import { runLintTargetWithConfigPath, type LintTargetResult } from "./runLintTarget.ts";

type ConsumerSettings = Record<string, unknown>;

const REPOSITORY_ROOT_PATH = resolve(import.meta.dir, "../../..");

function readFixtureConfigText(settings: ConsumerSettings): string {
  return [
    `import createOxlintConfig from ${JSON.stringify(join(REPOSITORY_ROOT_PATH, "src/oxlint/createOxlintConfig.ts"))};`,
    "",
    "export default createOxlintConfig(() => ({",
    `  settings: ${JSON.stringify(settings, null, 2)},`,
    "}));",
    "",
  ].join("\n");
}

export function runLintTargetFixtureWithConsumerConfig(
  fixturePath: string,
  settings: ConsumerSettings,
): LintTargetResult {
  const fixtureRepositoryPath = createFixtureRepo(fixturePath);
  const configPath = join(fixtureRepositoryPath, "oxlint.config.ts");

  writeFileSync(configPath, readFixtureConfigText(settings), "utf8");

  return runLintTargetWithConfigPath(fixtureRepositoryPath, configPath);
}
