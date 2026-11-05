import { describe, expect, it } from "bun:test";
import { createStoryOwnershipFixture, readStoryOwnershipDiagnostics } from "./helpers.ts";

const COMPONENT_PATH = "src/components/Button.tsx";
const STORY_PATH = "src/components/stories/Button.stories.tsx";
const PARTS = "function ButtonIcon() { return <span />; } function Other() { return <i />; }";
const TARGET = "function Button() { return <button />; }";

describe("wrapped compound story ownership", () => {
  it.each([
    ["inline parts", `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`],
    [
      "later source precedence",
      `export const Button = Object.assign(${TARGET}, { Icon: Other }, { Icon: ButtonIcon });`,
    ],
    [
      "stable source alias",
      `const parts = { Icon: ButtonIcon }; const alias = parts; export const Button = Object.assign(${TARGET}, alias);`,
    ],
    [
      "stable source spread",
      `const parts = { Icon: ButtonIcon }; export const Button = Object.assign(${TARGET}, { ...parts });`,
    ],
    [
      "unrelated trailing source",
      `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon }, { label: "Button" });`,
    ],
    ["static bracket callee", `export const Button = Object["assign"](${TARGET}, { Icon: ButtonIcon });`],
    [
      "unrelated lexical shadow",
      `function unrelated(Object) { Object.assign = Other; } export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "other native Object methods",
      `Object.keys({ value: 1 }); export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
  ])("resolves %s to the actual source binding", (_name, source) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: `${PARTS} ${source} export { ButtonIcon };`,
      [STORY_PATH]:
        'import { Button, ButtonIcon } from "../Button"; const meta: Meta<typeof ButtonIcon> = { component: Button.Icon }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });

  it.each([
    ["direct mutation", `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon }); Button.Icon = Other;`],
    [
      "alias mutation",
      `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon }); const alias = Button; alias.Icon = Other;`,
    ],
    ["escaped result", `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon }); change(Button);`],
    [
      "self mutation",
      "export const Button = Object.assign(function Button() { Button.Icon = Other; return <button />; }, { Icon: ButtonIcon });",
    ],
    [
      "mutated source",
      `const parts = { Icon: ButtonIcon }; parts.Icon = Other; export const Button = Object.assign(${TARGET}, parts);`,
    ],
    [
      "escaped source",
      `const parts = { Icon: ButtonIcon }; change(parts); export const Button = Object.assign(${TARGET}, parts);`,
    ],
    ["accessor source", `export const Button = Object.assign(${TARGET}, { get Icon() { return ButtonIcon; } });`],
    [
      "unrelated getter",
      `export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon, get other() { return Other; } });`,
    ],
    ["unknown source", `export const Button = Object.assign(${TARGET}, unknown, { Icon: ButtonIcon });`],
    ["unknown source spread", `export const Button = Object.assign(${TARGET}, { ...unknown, Icon: ButtonIcon });`],
    [
      "prototype source",
      `export const Button = Object.assign(${TARGET}, { ["__proto__"]: unknown, Icon: ButtonIcon });`,
    ],
    ["unknown computed key", `export const Button = Object.assign(${TARGET}, { [unknown]: Other, Icon: ButtonIcon });`],
    [
      "shadowed Object",
      `const Object = factory(); export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "replaced assign",
      `Object.assign = factory; export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "replaced assign through alias",
      `const objects = Object; objects.assign = factory; export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    ["escaped Object", `change(Object); export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`],
    [
      "globalThis replacement",
      `globalThis.Object.assign = factory; export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "function prototype mutation",
      `Function.prototype.Icon = Other; export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "reflected function prototype mutation",
      `Reflect.defineProperty(Function.prototype, "Icon", { set: change }); export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "Object prototype mutation",
      `Object.defineProperty(Object.prototype, "Icon", { set: change }); export const Button = Object.assign(${TARGET}, { Icon: ButtonIcon });`,
    ],
    [
      "cyclic source alias",
      `const parts = alias; const alias = parts; export const Button = Object.assign(${TARGET}, parts);`,
    ],
    ["spread arguments", `export const Button = Object.assign(${TARGET}, ...sources);`],
    ["unknown target", "export const Button = Object.assign(factory(), { Icon: ButtonIcon });"],
  ])("rejects %s", (_name, source) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: `${PARTS} ${source}`,
      [STORY_PATH]:
        'import { Button } from "../Button"; const meta: Meta<typeof Button.Icon> = { component: Button.Icon }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
  });
});
