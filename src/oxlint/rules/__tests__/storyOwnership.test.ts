import { describe, expect, it } from "bun:test";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createStoryOwnershipFixture, readStoryOwnershipDiagnostics } from "./helpers.ts";

const BUTTON_SOURCE = "export function Button() { return <button />; }";
const STORY_SOURCE =
  'import { Button } from "../../feature/Button.js"; const meta: Meta<typeof Button> = { component: Button }; export default meta;';
const STORY_PATH = "src/components/stories/catalog/Button.stories.tsx";
const COMPONENT_PATH = "src/components/feature/Button.tsx";

describe("resolved story ownership", () => {
  it("finds a feature component independently of its catalog group", () => {
    using repository = createStoryOwnershipFixture({ [COMPONENT_PATH]: BUTTON_SOURCE, [STORY_PATH]: STORY_SOURCE });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
    renameSync(
      join(repository.path, "src/components/stories/catalog"),
      join(repository.path, "src/components/stories/other"),
    );
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/stories/other/Button.stories.tsx")).toEqual(
      [],
    );
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });

  it("requires separate stories for same-named feature components", () => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: BUTTON_SOURCE,
      "src/components/other/Button.tsx": BUTTON_SOURCE,
      [STORY_PATH]: STORY_SOURCE,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([
      "missingComponentStoryFile",
    ]);
    writeFileSync(join(repository.path, STORY_PATH), STORY_SOURCE.replace("feature/Button", "other/Button"));
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([]);
    rmSync(join(repository.path, STORY_PATH));
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([
      "missingComponentStoryFile",
    ]);
  });

  it.each([
    ["missing metadata", "export default {};"],
    [
      "wrong component import",
      'import { Wrong } from "../Wrong"; const meta: Meta<typeof Wrong> = { component: Wrong }; export default meta;',
    ],
    [
      "different symbols in one module",
      'import { Button, ButtonIcon } from "../Button"; const meta: Meta<typeof Button> = { component: ButtonIcon }; export default meta;',
    ],
    [
      "unresolved component",
      'import { Button } from "./missing"; const meta: Meta<typeof Button> = { component: Button }; export default meta;',
    ],
    [
      "later unknown spread",
      'import { Button } from "../Button"; const meta: Meta<typeof Button> = { component: Button, ...unknown }; export default meta;',
    ],
    [
      "later computed property",
      'import { Button } from "../Button"; const meta: Meta<typeof Button> = { component: Button, [unknown]: Button }; export default meta;',
    ],
    [
      "getter component",
      'import { Button } from "../Button"; const meta: Meta<typeof Button> = { get component() { return Button; } }; export default meta;',
    ],
    [
      "mutable metadata",
      'import { Button } from "../Button"; let meta: Meta<typeof Button> = { component: Button }; export default meta;',
    ],
    [
      "untyped metadata",
      'import { Button } from "../Button"; const meta = { component: Button }; export default meta;',
    ],
  ])("rejects %s despite a same-named sibling file", (_name, story) => {
    using repository = createStoryOwnershipFixture({
      "src/components/Button.tsx": `${BUTTON_SOURCE} export function ButtonIcon() { return <i />; }`,
      "src/components/Wrong.tsx": "export function Wrong() { return <span />; }",
      "src/components/stories/Button.stories.tsx": story,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/stories/Button.stories.tsx")).toEqual([
      "missingSiblingComponent",
    ]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/Button.tsx")).toEqual([
      "missingComponentStoryFile",
    ]);
  });

  it.each([
    [
      "renamed binding",
      'import { Button as Control } from "../Button"; const meta: Meta<typeof Control> = { component: Control }; export default meta;',
    ],
    [
      "namespace binding",
      'import * as Controls from "../Button"; const meta: Meta<typeof Controls.Button> = { component: Controls.Button }; export default meta;',
    ],
    [
      "const alias",
      'import { Button } from "../Button"; const Control = Button; const meta: Meta<typeof Button> = { component: Control }; export default meta;',
    ],
    [
      "final explicit property",
      'import { Button } from "../Button"; const meta: Meta<typeof Button> = { ...unknown, component: Button }; export default meta;',
    ],
    [
      "resolved spread",
      'import { Button } from "../Button"; const defaults = { component: Button }; const meta: Meta<typeof Button> = { ...defaults }; export default meta;',
    ],
    [
      "unrelated trailing spread",
      'import { Button } from "../Button"; const defaults = { title: "Example" }; const meta: Meta<typeof Button> = { component: Button, ...defaults }; export default meta;',
    ],
    [
      "compound part",
      'import { ButtonParts } from "../Button"; const meta: Meta<typeof ButtonParts.Root> = { component: ButtonParts.Root }; export default meta;',
    ],
    [
      "inline compound part",
      'import { ButtonParts } from "../Button"; const meta: Meta<typeof ButtonParts.Inline> = { component: ButtonParts.Inline }; export default meta;',
    ],
    [
      "nested compound part",
      'import { ButtonParts } from "../Button"; const meta: Meta<typeof ButtonParts.Nested.Trigger> = { component: ButtonParts.Nested.Trigger }; export default meta;',
    ],
  ])("accepts exact ownership through %s", (_name, story) => {
    using repository = createStoryOwnershipFixture({
      "src/components/Button.tsx": `${BUTTON_SOURCE} export const ButtonParts = { Root: Button, Inline: () => <button />, Nested: { Trigger: Button } };`,
      "src/components/stories/Button.stories.tsx": story,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/stories/Button.stories.tsx")).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/Button.tsx")).toEqual([]);
  });

  it("follows renamed re-exports and observes barrel retargeting", () => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: BUTTON_SOURCE,
      "src/components/other/Button.tsx": BUTTON_SOURCE,
      "src/components/index.ts": 'export { Button as Control } from "./feature/Button.js";',
      [STORY_PATH]:
        'import { Control } from "../../index.js"; const meta: Meta<typeof Control> = { component: Control }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
    writeFileSync(
      join(repository.path, "src/components/index.ts"),
      'export { Button as Control } from "./other/Button.js";',
    );
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([]);
    rmSync(join(repository.path, "src/components/index.ts"));
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
  });

  it("observes tsconfig alias changes without restarting the plugin", () => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: BUTTON_SOURCE,
      "src/components/other/Button.tsx": BUTTON_SOURCE,
      "tsconfig.json": JSON.stringify({
        compilerOptions: { paths: { "@control": ["./src/components/feature/Button.tsx"] } },
      }),
      [STORY_PATH]:
        'import { Button } from "@control"; const meta: Meta<typeof Button> = { component: Button }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
    writeFileSync(
      join(repository.path, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "@control": ["./src/components/other/Button.tsx"] } } }),
    );
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([]);
  });

  it("observes package boundary creation and deletion", () => {
    using repository = createStoryOwnershipFixture({ [COMPONENT_PATH]: BUTTON_SOURCE, [STORY_PATH]: STORY_SOURCE });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    writeFileSync(join(repository.path, "src/components/feature/package.json"), '{"name":"nested","type":"module"}');
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
    rmSync(join(repository.path, "src/components/feature/package.json"));
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
  });

  it("observes package export retargeting and removal", () => {
    const manifest = (target: string) =>
      JSON.stringify({ name: "ownership-fixture", type: "module", exports: { "./control": target } });
    using repository = createStoryOwnershipFixture({
      "package.json": manifest("./src/components/feature/Button.tsx"),
      [COMPONENT_PATH]: BUTTON_SOURCE,
      "src/components/other/Button.tsx": BUTTON_SOURCE,
      [STORY_PATH]:
        'import { Button } from "ownership-fixture/control"; const meta: Meta<typeof Button> = { component: Button }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
    writeFileSync(join(repository.path, "package.json"), manifest("./src/components/other/Button.tsx"));
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/other/Button.tsx")).toEqual([]);
    writeFileSync(join(repository.path, "package.json"), '{"name":"ownership-fixture","type":"module"}');
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
  });

  it.each([
    ["star exports", 'export * from "./feature/Button"; export * from "./Other";', []],
    ["duplicate identical stars", 'export * from "./feature/Button"; export * from "./same";', []],
    [
      "named export overriding ambiguous stars",
      'export * from "./feature/Button"; export * from "./other/Button"; export { Button } from "./feature/Button";',
      [],
    ],
    [
      "ambiguous stars",
      'export * from "./feature/Button"; export * from "./other/Button";',
      ["missingSiblingComponent"],
    ],
    ["nested ambiguity", 'export * from "./ambiguous"; export * from "./feature/Button";', ["missingSiblingComponent"]],
    [
      "missing star module",
      'export * from "./missing"; export * from "./feature/Button";',
      ["missingSiblingComponent"],
    ],
    ["invalid syntax", 'export * from "./feature/Button"; const broken = ;', ["missingSiblingComponent"]],
    ["cyclic re-exports", 'export { Button } from "./cycle";', ["missingSiblingComponent"]],
  ])("handles %s without guessing an owner", (_name, barrel, expected) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: BUTTON_SOURCE,
      "src/components/other/Button.tsx": BUTTON_SOURCE,
      "src/components/Other.tsx": "export function Other() { return <span />; }",
      "src/components/index.ts": barrel,
      "src/components/same.ts": 'export { Button } from "./feature/Button";',
      "src/components/ambiguous.ts": 'export * from "./feature/Button"; export * from "./other/Button";',
      "src/components/cycle.ts": 'export { Button } from "./index";',
      [STORY_PATH]:
        'import { Button } from "../../index"; const meta: Meta<typeof Button> = { component: Button }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(expected);
  });

  it("follows namespace re-exports and a named default component", () => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export default function Button() { return <button />; }",
      "src/components/index.ts": 'export * as Controls from "./feature/Button";',
      [STORY_PATH]:
        'import { Controls } from "../../index"; const meta: Meta<typeof Controls.default> = { component: Controls.default }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });

  it("does not inherit ownership from a checkout ancestor named components", () => {
    using repository = createStoryOwnershipFixture({
      "components/project/package.json": '{"name":"nested","type":"module"}',
      "components/project/src/Button.tsx": BUTTON_SOURCE,
      "components/project/src/stories/Button.stories.tsx":
        'import { Button } from "../Button"; const meta: Meta<typeof Button> = { component: Button }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, "components/project/src/stories/Button.stories.tsx")).toEqual(
      ["invalidStoryFileLocation"],
    );
  });

  it.each([
    ["other ownership area", "src/templates/Button.tsx", "../../templates/Button"],
    ["test support", "src/components/__tests__/Button.tsx", "../__tests__/Button"],
    ["hook support", "src/components/hooks/Button.tsx", "../hooks/Button"],
    ["story support", "src/components/stories/fixtures/Button.tsx", "./fixtures/Button"],
  ])("rejects a component in %s", (_name, componentPath, specifier) => {
    using repository = createStoryOwnershipFixture({
      [componentPath]: BUTTON_SOURCE,
      "src/components/Button.tsx": BUTTON_SOURCE,
      "src/components/stories/Button.stories.tsx": `import { Button } from "${specifier}"; const meta: Meta<typeof Button> = { component: Button }; export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, "src/components/stories/Button.stories.tsx")).toEqual([
      "missingSiblingComponent",
    ]);
  });
});
