import { describe, expect, it } from "bun:test";
import { createStoryOwnershipFixture, readStoryOwnershipDiagnostics } from "./helpers.ts";

const COMPONENT_PATH = "src/components/Button.tsx";
const STORY_PATH = "src/components/stories/Button.stories.tsx";
const IMPORTS = 'import { Button } from "../Button"; import { Other } from "../Other";';

describe("stable story metadata bindings", () => {
  it.each([
    ["duplicate named imports", 'import { ButtonParts as A, ButtonParts as B } from "../Button"; B.Root = Other;'],
    [
      "namespace and named imports",
      'import { ButtonParts as A } from "../Button"; import * as Controls from "../Button"; Controls.ButtonParts.Root = Other;',
    ],
    [
      "barrel and direct imports",
      'import { Alias as A } from "../index"; import { ButtonParts as B } from "../Button"; B.Root = Other;',
    ],
    [
      "namespace alias mutation",
      'import { ButtonParts as A } from "../Button"; import * as Controls from "../Button"; const alias = Controls; alias.ButtonParts.Root = Other;',
    ],
    [
      "bare namespace escape",
      'import { ButtonParts as A } from "../Button"; import * as Controls from "../Button"; change(Controls);',
    ],
    [
      "star barrel namespace escape",
      'import { ButtonParts as A } from "../Button"; import * as Controls from "../star"; change(Controls);',
    ],
    [
      "nested namespace escape",
      'import { ButtonParts as A } from "../Button"; import * as Controls from "../nested"; change(Controls);',
    ],
  ])("rejects compound mutation through %s", (_name, imports) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; } export const ButtonParts = { Root: Button };",
      "src/components/Other.tsx": "export function Other() { return <div />; }",
      "src/components/index.ts": 'export { ButtonParts as Alias } from "./Button";',
      "src/components/star.ts": 'export * from "./Button";',
      "src/components/nested.ts": 'export * as Parts from "./Button";',
      [STORY_PATH]: `import { Other } from "../Other"; ${imports} const meta: Meta<typeof A.Root> = { component: A.Root }; export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
  });

  it("preserves an unchanged imported object when another import is mutated", () => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; } export const ButtonParts = { Root: Button };",
      "src/components/Other.tsx": "export const OtherParts = { Root: () => <div /> };",
      [STORY_PATH]:
        'import { ButtonParts as A, ButtonParts as B } from "../Button"; import { OtherParts } from "../Other"; OtherParts.Root = undefined; const meta: Meta<typeof A.Root> = { component: B.Root }; export default meta;',
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });

  it.each([
    [
      "numeric coercion invokes a mutating method",
      "const defaults = { component: Button, valueOf() { this.component = Other; return 1; } }; +defaults; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "nested mutation through a shallow spread copy",
      "const parts = { Nested: { Root: Button } }; const copy = { ...parts }; copy.Nested.Root = Other; const meta: Meta<typeof Button> = { component: parts.Nested.Root };",
    ],
    [
      "nested alias mutation through a shallow spread copy",
      "const parts = { Nested: { Root: Button } }; const copy = { ...parts }; const alias = copy.Nested; alias.Root = Other; const meta: Meta<typeof Button> = { component: parts.Nested.Root };",
    ],
    [
      "escaping shallow spread copy",
      "const parts = { Nested: { Root: Button } }; const copy = { ...parts }; change(copy); const meta: Meta<typeof Button> = { component: parts.Nested.Root };",
    ],
    [
      "spread source assignment",
      "const defaults = { component: Button }; defaults.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "spread source deletion",
      "const defaults = { component: Button }; delete defaults.component; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "spread alias mutation",
      "const defaults = { component: Button }; const alias = defaults; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "escaping spread source",
      "const defaults = { component: Button }; change(defaults); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "assigned spread source",
      "const defaults = { component: Button }; Object.assign(defaults, { component: Other }); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    ["default metadata mutation", "const meta: Meta<typeof Button> = { component: Button }; meta.component = Other;"],
    [
      "default metadata alias mutation",
      "const meta: Meta<typeof Button> = { component: Button }; const alias = meta; alias.component = Other;",
    ],
    ["escaping default metadata", "const meta: Meta<typeof Button> = { component: Button }; change(meta);"],
    [
      "mutated compound binding",
      "const parts = { Root: Button }; parts.Root = Other; const meta: Meta<typeof Button> = { component: parts.Root };",
    ],
    [
      "bracket spread source assignment",
      'const defaults = { component: Button }; defaults["component"] = Other; const meta: Meta<typeof Button> = { ...defaults };',
    ],
    [
      "computed spread source assignment",
      'const defaults = { component: Button }; const key = "component"; defaults[key] = Other; const meta: Meta<typeof Button> = { ...defaults };',
    ],
    [
      "spread source update",
      "const defaults = { component: Button }; defaults.component++; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "bracket spread source deletion",
      'const defaults = { component: Button }; delete defaults["component"]; const meta: Meta<typeof Button> = { ...defaults };',
    ],
    [
      "destructuring assignment target",
      "const defaults = { component: Button }; ({ component: defaults.component } = { component: Other }); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "iteration assignment target",
      "const defaults = { component: Button }; for (defaults.component of [Other]) {} const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "spread alias chain mutation",
      "const defaults = { component: Button }; const first = defaults; const second = first; second.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "mutation observed through an alias chain",
      "const defaults = { component: Button }; const first = defaults; const second = first; defaults.component = Other; const meta: Meta<typeof Button> = { ...second };",
    ],
    [
      "closure mutation",
      "const defaults = { component: Button }; function change() { defaults.component = Other; } change(); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "forward closure mutation",
      "function change() { defaults.component = Other; } const defaults = { component: Button }; change(); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "alias closure mutation",
      "const defaults = { component: Button }; const alias = defaults; function change() { alias.component = Other; } change(); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "reflected spread source mutation",
      'const defaults = { component: Button }; Reflect.set(defaults, "component", Other); const meta: Meta<typeof Button> = { ...defaults };',
    ],
    [
      "constructor escape",
      "const defaults = { component: Button }; new Configurator(defaults); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "spread source method mutation",
      "const defaults = { component: Button, change() { this.component = Other; } }; defaults.change(); const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "mutable alias mutation",
      "const defaults = { component: Button }; let alias = defaults; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "assigned mutable alias mutation",
      "const defaults = { component: Button }; let alias; alias = defaults; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "object storage mutation",
      "const defaults = { component: Button }; const holder = { defaults }; holder.defaults.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "array storage mutation",
      "const defaults = { component: Button }; const values = [defaults]; values[0].component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "returned object mutation",
      "const defaults = { component: Button }; function read() { return defaults; } const alias = read(); alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "yielded object mutation",
      "const defaults = { component: Button }; function* read() { yield defaults; } const alias = read().next().value; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "stored member alias mutation",
      "const defaults = { component: Button }; const holder = { defaults }; const alias = holder.defaults; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "nested compound member alias mutation",
      "const parts = { Nested: { Root: Button } }; const alias = parts.Nested; alias.Root = Other; const meta: Meta<typeof Button> = { component: parts.Nested.Root };",
    ],
    [
      "type declaration does not shadow a runtime mutation",
      "const defaults = { component: Button }; { type defaults = { component: typeof Other }; defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "bracket default metadata mutation",
      'const meta: Meta<typeof Button> = { component: Button }; meta["component"] = Other;',
    ],
    ["default metadata deletion", "const meta: Meta<typeof Button> = { component: Button }; delete meta.component;"],
    [
      "default metadata alias chain mutation",
      "const meta: Meta<typeof Button> = { component: Button }; const first = meta; const second = first; second.component = Other;",
    ],
    [
      "default metadata closure mutation",
      "const meta: Meta<typeof Button> = { component: Button }; function change() { meta.component = Other; } change();",
    ],
    [
      "assigned default metadata",
      "const meta: Meta<typeof Button> = { component: Button }; Object.assign(meta, { component: Other });",
    ],
    [
      "default metadata method mutation",
      "const meta: Meta<typeof Button> = { component: Button, change() { this.component = Other; } }; meta.change();",
    ],
    [
      "spread getter mutates the later component property",
      'const defaults = { get title() { this.component = Other; return "Example"; }, component: Button }; const meta: Meta<typeof Button> = { ...defaults };',
    ],
    [
      "default metadata getter mutation",
      'const meta: Meta<typeof Button> = { component: Button, get title() { this.component = Other; return "Example"; } }; const title = meta.title;',
    ],
  ])("rejects %s", (_name, source) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; }",
      "src/components/Other.tsx": "export function Other() { return <div />; }",
      [STORY_PATH]: `${IMPORTS} ${source} export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual(["missingSiblingComponent"]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual(["missingComponentStoryFile"]);
  });

  it.each([
    [
      "shadowed parameter mutation",
      "const defaults = { component: Button }; function change(defaults) { defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed block mutation",
      "const defaults = { component: Button }; { const defaults = { component: Other }; defaults.component = Button; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "independent spread-copy mutation",
      "const defaults = { component: Button }; const copy = { ...defaults }; copy.component = Other; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "final explicit ownership",
      "const defaults = { component: Button }; change(defaults); const meta: Meta<typeof Button> = { ...defaults, component: Button };",
    ],
    [
      "unmutated alias",
      "const defaults = { component: Button }; const alias = defaults; const meta: Meta<typeof Button> = { ...alias };",
    ],
    [
      "unmutated alias chain",
      "const defaults = { component: Button }; const first = defaults; const second = first; const meta: Meta<typeof Button> = { ...second };",
    ],
    [
      "shadowed arrow parameter mutation",
      "const defaults = { component: Button }; const change = (defaults) => { defaults.component = Other; }; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed destructured parameter mutation",
      "const defaults = { component: Button }; function change({ defaults }) { defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed destructured block mutation",
      "const defaults = { component: Button }; { const { defaults } = { defaults: { component: Other } }; defaults.component = Button; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed catch binding mutation",
      "const defaults = { component: Button }; try {} catch (defaults) { defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed loop binding mutation",
      "const defaults = { component: Button }; for (const defaults of []) { defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "hoisted function var shadows the module binding",
      "const defaults = { component: Button }; function change() { { var defaults = { component: Other }; } defaults.component = Button; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed function declaration mutation",
      "const defaults = { component: Button }; function change() { function defaults() {} defaults.component = Other; } const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed named class mutation",
      "const defaults = { component: Button }; const Change = class defaults { static component = Other; static change() { defaults.component = Button; } }; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "shadowed alias parameter mutation",
      "const defaults = { component: Button }; const alias = defaults; function change(alias) { alias.component = Other; } const meta: Meta<typeof Button> = { ...alias };",
    ],
    [
      "shadowed metadata parameter mutation",
      "const meta: Meta<typeof Button> = { component: Button }; function change(meta) { meta.component = Other; }",
    ],
    [
      "unrelated object mutation",
      "const defaults = { component: Button }; const unrelated = { component: Other }; unrelated.component = Button; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "property read",
      "const defaults = { component: Button }; const component = defaults.component; const meta: Meta<typeof Button> = { ...defaults };",
    ],
    [
      "metadata type query",
      "const meta: Meta<typeof Button> = { component: Button }; type Story = StoryObj<typeof meta>;",
    ],
    [
      "explicit ownership after an alias mutation",
      "const defaults = { component: Button }; const alias = defaults; alias.component = Other; const meta: Meta<typeof Button> = { ...defaults, component: Button };",
    ],
    [
      "explicit ownership after a spread getter",
      'const defaults = { get title() { this.component = Other; return "Example"; }, component: Button }; const meta: Meta<typeof Button> = { ...defaults, component: Button };',
    ],
  ])("preserves %s", (_name, source) => {
    using repository = createStoryOwnershipFixture({
      [COMPONENT_PATH]: "export function Button() { return <button />; }",
      "src/components/Other.tsx": "export function Other() { return <div />; }",
      [STORY_PATH]: `${IMPORTS} ${source} export default meta;`,
    });
    expect(readStoryOwnershipDiagnostics(repository.path, STORY_PATH)).toEqual([]);
    expect(readStoryOwnershipDiagnostics(repository.path, COMPONENT_PATH)).toEqual([]);
  });
});
