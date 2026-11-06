import { describe, expect, it } from "bun:test";
import { readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createFixtureRepo } from "../test-support/createFixtureRepo.ts";
import { runLintTarget, runLintTargetWithConfigPath } from "../test-support/runLintTarget.ts";

describe("resolved story ownership under the complete policy", () => {
  it.each([
    [
      "replaced assignment",
      "Object.assign = function (target, source) { source.component = PaymentButton; return target; }; Object.assign(function Target() {}, defaults);",
    ],
    [
      "native assignment prototype setter",
      'Object.assign(function Target() {}, { ["__proto__"]: { set payload(value) { value.component = PaymentButton; } } }, { payload: defaults });',
    ],
  ])("rejects metadata mutated through %s", (_name, operation) => {
    using repository = createFixtureRepo("story-ownership");
    const filename = join(repository.path, "src/components/stories/actions/Button.stories.tsx");
    const source = readFileSync(filename, "utf8")
      .replace(
        "const meta: Meta<typeof Button> = {",
        'import { Button as PaymentButton } from "../../payment/Button.js";\nconst defaults = { component: Button };\n' +
          operation +
          "\nconst meta: Meta<typeof Button> = {",
      )
      .replace("component: Button,", "...defaults,");
    writeFileSync(filename, source);
    const result = runLintTarget(repository.path);
    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      "@alexgorbatchev(component-story-file-convention)",
      "@alexgorbatchev(story-file-location-convention)",
    ]);
  });

  it("rejects compound construction through an aliased replacement of Object.assign", () => {
    using repository = createFixtureRepo("story-ownership");
    writeFileSync(
      join(repository.path, "src/components/account/Button.tsx"),
      'function ButtonIcon() { return <span data-testid="ButtonIcon" />; }\nconst globals = globalThis;\nglobals.Object.assign = function (target) { return target; };\nexport const Button = Object.assign(function Button() { return <button data-testid="Button" />; }, { Icon: ButtonIcon });\n',
    );
    const filename = join(repository.path, "src/components/stories/actions/Button.stories.tsx");
    writeFileSync(
      filename,
      readFileSync(filename, "utf8")
        .replaceAll("typeof Button", "typeof Button.Icon")
        .replace("component: Button,", "component: Button.Icon,"),
    );
    const result = runLintTarget(repository.path);
    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      "@alexgorbatchev(component-story-file-convention)",
      "@alexgorbatchev(story-file-location-convention)",
    ]);
  });

  it("accepts a wrapped compound component's exact part and rejects a mismatched part", () => {
    using repository = createFixtureRepo("story-ownership");
    writeFileSync(
      join(repository.path, "src/components/account/Button.tsx"),
      'function ButtonIcon() { return <span data-testid="ButtonIcon" />; }\n' +
        'export const Button = Object.assign(function Button() { return <button data-testid="Button" />; }, { Icon: ButtonIcon });\n',
    );
    expect(runLintTarget(repository.path)).toMatchObject({ exitCode: 0, issues: [] });
    const filename = join(repository.path, "src/components/stories/actions/Button.stories.tsx");
    const source = readFileSync(filename, "utf8")
      .replaceAll("typeof Button", "typeof Button.Icon")
      .replace("component: Button,", "component: Button.Icon,");
    writeFileSync(filename, source);
    expect(runLintTarget(repository.path)).toMatchObject({ exitCode: 0, issues: [] });

    writeFileSync(filename, source.replace("component: Button.Icon,", "component: Button,"));
    const result = runLintTarget(repository.path);
    expect(result.exitCode).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      "@alexgorbatchev(component-story-file-convention)",
      "@alexgorbatchev(story-file-location-convention)",
    ]);
  });

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
