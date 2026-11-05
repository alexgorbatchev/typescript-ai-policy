import { describe, expect, it } from "bun:test";
import { readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createFixtureRepo } from "../test-support/createFixtureRepo.ts";
import { runLintTarget, runLintTargetWithConfigPath } from "../test-support/runLintTarget.ts";

describe("resolved story ownership under the complete policy", () => {
  it("rejects metadata retargeted after initialization", () => {
    using repository = createFixtureRepo("story-ownership");
    const filename = join(repository.path, "src/components/stories/actions/Button.stories.tsx");
    const source = readFileSync(filename, "utf8")
      .replace(
        'import { Button } from "../../account/Button.js";',
        'import { Button } from "../../account/Button.js";\nimport { Button as PaymentButton } from "../../payment/Button.js";',
      )
      .replace("export default meta;", "meta.component = PaymentButton;\nexport default meta;");
    writeFileSync(filename, source);
    const result = runLintTarget(repository.path);
    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      "@alexgorbatchev(component-story-file-convention)",
      "@alexgorbatchev(story-file-location-convention)",
    ]);
  });

  it("accepts a valid story explicitly linted through a checkout symlink", () => {
    using repository = createFixtureRepo("story-ownership");
    symlinkSync(repository.path, join(repository.path, "linked"), "junction");
    expect(
      runLintTargetWithConfigPath(repository.path, resolve(import.meta.dir, "../oxlint.config.ts"), [
        "linked/src/components/stories/actions/Button.stories.tsx",
      ]),
    ).toMatchObject({
      exitCode: 0,
      issues: [],
    });
  });

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
