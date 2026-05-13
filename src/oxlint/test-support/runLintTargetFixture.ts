import { afterAll } from "bun:test";
import { rmSync } from "node:fs";
import { createFixtureRepo } from "./createFixtureRepo.ts";
import { runLintTarget, type LintTargetResult } from "./runLintTarget.ts";

const createdFixtureRepositoryPaths = new Set<string>();

afterAll(() => {
  createdFixtureRepositoryPaths.forEach((fixtureRepositoryPath) => {
    rmSync(fixtureRepositoryPath, { recursive: true, force: true });
  });
});

export function runLintTargetFixture(fixtureName: string): LintTargetResult {
  const fixtureRepositoryPath = createFixtureRepo(fixtureName);
  createdFixtureRepositoryPaths.add(fixtureRepositoryPath);

  return runLintTarget(fixtureRepositoryPath);
}
