import { describe, expect, it } from "bun:test";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFixtureRepo } from "../test-support/createFixtureRepo.ts";
import { runLintTarget } from "../test-support/runLintTarget.ts";

describe("resolved story ownership under the complete policy", () => {
  it("keeps grouped and feature-local stories tied to their actual same-named source", () => {
    using repository = createFixtureRepo("story-ownership");
    expect(runLintTarget(repository.path)).toMatchObject({ exitCode: 0, issues: [] });

    const oldGroup = join(repository.path, "src/components/stories/actions");
    const newGroup = join(repository.path, "src/components/stories/forms");
    renameSync(oldGroup, newGroup);
    const storyPath = join(newGroup, "Button.stories.tsx");
    const source = readFileSync(storyPath, "utf8").replace("components/actions/Button", "components/forms/Button");
    writeFileSync(storyPath, source);
    expect(runLintTarget(repository.path)).toMatchObject({ exitCode: 0, issues: [] });

    writeFileSync(storyPath, source.replace("account/Button.js", "payment/Button.js"));
    const result = runLintTarget(repository.path);
    expect(result.exitCode).toBe(1);
    expect(result.issues).toMatchObject([
      { filePath: "src/components/account/Button.tsx", ruleId: "@alexgorbatchev(component-story-file-convention)" },
    ]);
  });
});
