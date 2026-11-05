import { createFixtureRepo } from "./createFixtureRepo.ts";
import { runLintTarget, type LintTargetResult } from "./runLintTarget.ts";

export function runLintTargetFixture(fixtureName: string): LintTargetResult {
  using fixtureRepository = createFixtureRepo(fixtureName);

  return runLintTarget(fixtureRepository.path);
}
