import { describe, expect, it } from "bun:test";
import { createStoryOwnershipFixture, readStoryOwnershipDiagnostics } from "./helpers.ts";

const COMPONENT_PATH = "src/components/Button.tsx";
const STORY_PATH = "src/components/stories/Button.stories.tsx";

describe("native assignment source safety", () => {
  it.each([
    ["replaced intrinsic", "Object.assign = replace; Object.assign(function Target() {}, defaults);"],
    ["later intrinsic mutation", "Object.assign(function Target() {}, defaults); Object.assign = replace;"],
    [
      "aliased intrinsic",
      "const objects = Object; objects.assign = replace; Object.assign(function Target() {}, defaults);",
    ],
    [
      "aliased global",
      "const globals = globalThis; globals.Object.assign = replace; Object.assign(function Target() {}, defaults);",
    ],
    ["escaped global", "change(globalThis); Object.assign(function Target() {}, defaults);"],
    ["unknown source", "Object.assign(function Target() {}, unknown, { payload: defaults });"],
    [
      "source prototype setter",
      'Object.assign(function Target() {}, { ["__proto__"]: { set payload(value) { value.component = Other; } } }, { payload: defaults });',
    ],
    [
      "aliased prototype source",
      'const source = { ["__proto__"]: { set payload(value) { value.component = Other; } } }; Object.assign(function Target() {}, source, { payload: defaults });',
    ],
    [
      "spread prototype source",
      'const source = { ["__proto__"]: { set payload(value) { value.component = Other; } } }; Object.assign(function Target() {}, { ...source }, { payload: defaults });',
    ],
    ["computed source key", "Object.assign(function Target() {}, { [unknown]: defaults });"],
    [
      "accessor source",
      "Object.assign(function Target() {}, defaults, { defaults, get trigger() { this.defaults.component = Other; return true; } });",
    ],
    [
      "mutated source",
      'const source = { payload: defaults }; Object.defineProperty(source, "payload", { get: change }); Object.assign(function Target() {}, source);',
    ],
    [
      "cyclic source",
      "const source = alias; const alias = source; Object.assign(function Target() {}, source, defaults);",
    ],
    ["mutable source binding", "let source = { label: true }; Object.assign(function Target() {}, source, defaults);"],
  ])("rejects metadata exposed through %s", (_name, operation) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; }",
      "src/components/Other.tsx": "export function Other() { return <i />; }",
      [STORY_PATH]:
        'import { Button } from "../Button"; import { Other } from "../Other"; ' +
        "function replace(target, source) { source.component = Other; return target; } " +
        `const defaults = { component: Button }; ${operation} const meta: Meta<typeof Button> = { ...defaults }; export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
  });

  it.each([
    "Object.assign(function Target() {}, defaults);",
    "const alias = defaults; Object.assign(function Target() {}, alias);",
    "Object.assign(function Target() {}, { ...defaults });",
    "const copy = Object.assign(function Target() {}, defaults); copy.component = undefined;",
    "const parts = { label: true }; const alias = parts; function copy(parts) { Object.assign(function Target() {}, alias, defaults); }",
  ])("preserves metadata copied by a safe call: %s", (operation) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; }",
      [STORY_PATH]: `import { Button } from "../Button"; const defaults = { component: Button }; ${operation} const meta: Meta<typeof Button> = { ...defaults }; export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });
});
