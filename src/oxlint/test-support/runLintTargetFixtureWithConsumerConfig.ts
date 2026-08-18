import { afterAll } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FilenameStyle, type CreateOxlintConfigOptions } from "../createOxlintConfig.ts";
import { createFixtureRepo } from "./createFixtureRepo.ts";
import { runLintTargetWithConfigPath, type LintTargetResult } from "./runLintTarget.ts";

type ConsumerSettings = Record<string, unknown>;

const createdFixtureRepositoryPaths = new Set<string>();
const REPOSITORY_ROOT_PATH = resolve(import.meta.dir, "../../..");

afterAll(() => {
  createdFixtureRepositoryPaths.forEach((fixtureRepositoryPath) => {
    rmSync(fixtureRepositoryPath, { recursive: true, force: true });
  });
});

function readFixtureConfigText(settings: ConsumerSettings, options: CreateOxlintConfigOptions): string {
  const filenameStyleLine = readFilenameStyleLine(options.filenameStyle);
  const createOxlintConfigImportLine = filenameStyleLine
    ? `import createOxlintConfig, { FilenameStyle } from ${JSON.stringify(join(REPOSITORY_ROOT_PATH, "src/oxlint/createOxlintConfig.ts"))};`
    : `import createOxlintConfig from ${JSON.stringify(join(REPOSITORY_ROOT_PATH, "src/oxlint/createOxlintConfig.ts"))};`;

  return [
    createOxlintConfigImportLine,
    "",
    `export default createOxlintConfig({`,
    ...(filenameStyleLine ? [filenameStyleLine] : []),
    `  settings: ${JSON.stringify(settings, null, 2)},`,
    "});",
    "",
  ].join("\n");
}

function readFilenameStyleLine(filenameStyle: CreateOxlintConfigOptions["filenameStyle"]): string | null {
  switch (filenameStyle) {
    case undefined:
      return null;
    case FilenameStyle.PascalCase:
      return "  filenameStyle: FilenameStyle.PascalCase,";
    case FilenameStyle.DashCase:
      return "  filenameStyle: FilenameStyle.DashCase,";
    default:
      return null;
  }
}

export function runLintTargetFixtureWithConsumerConfig(
  fixturePath: string,
  settings: ConsumerSettings,
  options: CreateOxlintConfigOptions = {},
): LintTargetResult {
  const fixtureRepositoryPath = createFixtureRepo(fixturePath);
  createdFixtureRepositoryPaths.add(fixtureRepositoryPath);
  const configPath = join(fixtureRepositoryPath, "oxlint.config.ts");

  writeFileSync(configPath, readFixtureConfigText(settings, options), "utf8");

  return runLintTargetWithConfigPath(fixtureRepositoryPath, configPath);
}
