# Oxlint policy pack

This package ships a shared Oxlint config plus a local TypeScript plugin source that encodes repository policy for
agentic coding workflows.

## Philosophy

The custom `@alexgorbatchev/*` rules are not generic style rules. They are **codified policies** that make
index-barrel structure, constants-vs-types boundaries, test layout, fixture structure, React test ids, and test
isolation deterministic enough for LLM agents to follow reliably.

Within the custom plugin, rule messages are intentionally written as **LLM steering instructions**: they explain what
must change, where it must move, and which replacement shape is required.

The config also enables a small set of upstream Oxlint/Jest/TypeScript rules as baseline guardrails for correctness and
type safety.

The rules are intended to operate as a **coordinated contract**, not as isolated toggles. Many of them reinforce one
another across file layout, fixture entrypoints, naming, typing, and import paths. Disabling a single rule can have
broader effects than the local violation it appears to cover, because it may break assumptions relied on by the rest of
the rule set. Treat opt-outs as contract changes to the overall agent workflow.

The fixture rules are the clearest example of this coupling. Together they define the fixture contract across:

- location
- allowed contents
- export shape
- naming
- typing
- import path
- single entrypoint

Disabling one of those rules is not an isolated relaxation; it changes assumptions used by the rest of the fixture
workflow.

## Enforcement model

The shared config intentionally applies the policy in stages so Oxlint does not waste time running file-specific rules
on files that cannot meaningfully violate them.

1. **Global ingress and leak guards** run everywhere because they must catch files that are not yet in the required
   role directories:
   - `@alexgorbatchev/no-imports-from-tests-directory`
   - `@alexgorbatchev/no-type-imports-from-constants`
   - `@alexgorbatchev/test-file-location-convention`
   - `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint`
2. **TypeScript-wide naming, explicit-type, and template-literal rules** run on all `**/*.{ts,tsx,mts,cts}` files:
   - `@alexgorbatchev/interface-naming-convention`
   - `@alexgorbatchev/no-inline-type-expressions`
   - `@alexgorbatchev/require-template-indent`
3. **React component ownership rules** run on all `**/*.tsx` files, with the component-file rules themselves
   exempting `stories/`, `__tests__/`, and support basenames:
   - `@alexgorbatchev/testid-naming-convention`
   - `@alexgorbatchev/require-component-root-testid`
   - `@alexgorbatchev/component-file-contract`
   - `@alexgorbatchev/component-file-naming-convention`
   - `@alexgorbatchev/component-story-file-convention`
4. **Storybook file rules** run only on `**/*.stories.tsx`:
   - story files explicitly turn off `@alexgorbatchev/testid-naming-convention` and `@alexgorbatchev/require-component-root-testid` because story harnesses are not ownership components
   - `@alexgorbatchev/story-file-location-convention`
   - `@alexgorbatchev/story-meta-type-annotation`
   - `@alexgorbatchev/story-export-contract`
   - `@alexgorbatchev/no-inline-fixture-bindings-in-tests`
   - `@alexgorbatchev/fixture-import-path-convention`
5. **Hook ownership rules** run on any `use*.ts` or `use*.tsx` filename, regardless of parent directory:
   - `@alexgorbatchev/hook-file-contract`
   - `@alexgorbatchev/hook-file-naming-convention`
   - `@alexgorbatchev/hook-test-file-convention`
6. **Filename-addressable file-role rules** run only on the exact file role they govern:
   - `@alexgorbatchev/index-file-contract` on `**/index.ts` and `**/index.tsx`
   - `@alexgorbatchev/no-type-exports-from-constants` on `**/constants.{ts,tsx,mts,cts}` and `**/constants.d.{ts,tsx,mts,cts}`
   - `@alexgorbatchev/no-value-exports-from-types` on `**/types.{ts,tsx,mts,cts}` and `**/types.d.{ts,tsx,mts,cts}`
7. **`__tests__/` area rules** run anywhere under `**/__tests__/**`:
   - `@alexgorbatchev/no-module-mocking`
8. **Test-file rules** run on `__tests__/**/*.test.ts` and `__tests__/**/*.test.tsx`:
   - test files explicitly turn off `@alexgorbatchev/testid-naming-convention` and `@alexgorbatchev/require-component-root-testid` because test harnesses are not ownership components
   - `@alexgorbatchev/no-non-running-tests`
   - `@alexgorbatchev/no-conditional-logic-in-tests`
   - `@alexgorbatchev/no-throw-in-tests`
   - `@alexgorbatchev/no-test-file-exports`
   - `@alexgorbatchev/no-inline-fixture-bindings-in-tests`
   - `@alexgorbatchev/fixture-import-path-convention`
   - `jest/no-disabled-tests`
   - `jest/no-focused-tests`
9. **Fixture-entrypoint and fixture-area rules** run on nested `fixtures.ts`, `fixtures.tsx`, and `fixtures/`
   directories anywhere under `__tests__/` or `stories/`, depending on the rule.

This staged configuration is part of the contract. The global rules only protect the remaining hard placement
requirements: tests must live under `__tests__/`, fixture exports must stay under `__tests__/` or `stories/`, and
story files must live under `stories/`. Component and hook ownership rules no longer require canonical parent folder
names such as `components/`, `templates/`, `layouts/`, or `hooks/`, but they still enforce ownership, naming, and
matching story or test files once a file clearly has that role.

## Enabled rules

This section covers the active error rules in the shared config. Some rules are global and some are activated only by
file-pattern overrides. Two upstream rules are explicitly disabled and are not part of the policy surface:
`no-console` and `jsx-a11y/no-autofocus`.

### `eqeqeq`

**Policy:** Use strict equality so agents do not depend on JavaScript coercion.

**Good**

```ts
if (status === "ready") {
  return true;
}
```

**Bad**

```ts
if (status == "ready") {
  return true;
}
```

### `typescript/no-explicit-any`

**Policy:** Keep type contracts explicit and reviewable; do not opt out of the type system with `any`.

**Good**

```ts
type UserRow = { id: string };

function readRows(): UserRow[] {
  return [];
}
```

**Bad**

```ts
function readRows(): any[] {
  return [];
}
```

### `jest/no-disabled-tests`

**Policy:** Committed test files must not contain skipped or disabled tests.

**Good**

```ts
describe("SignalPanel", () => {
  it("renders", () => {});
});
```

**Bad**

```ts
describe.skip("SignalPanel", () => {
  it("renders", () => {});
});
```

### `jest/no-focused-tests`

**Policy:** Committed test files must not contain focused tests that hide the rest of the suite.

**Good**

```ts
it("renders", () => {});
```

**Bad**

```ts
it.only("renders", () => {});
```

## Type declaration naming policy

### `@alexgorbatchev/interface-naming-convention`

**Policy:** Repository-owned interfaces must use `I` followed by PascalCase. Ambient declaration-merging interfaces
that must keep an external contract name, such as `Window`, `ImportMetaEnv`, or `JSX.IntrinsicElements`, are exempt.

**Good**

```ts
export interface IUserProfile {
  id: string;
}
```

```ts
declare global {
  interface Window {
    analytics: { track: () => void };
  }
}
```

**Bad**

```ts
export interface UserProfile {
  id: string;
}
```

```ts
export interface IuserProfile {
  id: string;
}
```

**Companion semantic fix:** From this repository root, `bun run fix:semantic -- <target-directory>` can apply supported interface renames through the `tsgo` LSP backend. The fixer is intentionally conservative: it only applies mechanical renames when the current interface name can be normalized safely to `I[A-Z][A-Za-z0-9]*`.

## Explicit type-expression policies

### `@alexgorbatchev/no-inline-type-expressions`

**Policy:** Outside type declarations, explicit type usage must rely on named declarations or inference. Do not define object, tuple, function, broad union, intersection, mapped, or conditional types inline at the usage site. Repair order matters: first reuse an existing named type if one already models the contract, then extract a new owned named type only when necessary, and only fall back to inference when the type is already obvious from context. Narrow nullable or undefinable wrappers such as `T | null`, `T | undefined`, and `T | null | undefined` stay allowed.

**Good**

```ts
interface IUserRef {
  id: string;
}

const userRef: IUserRef = sourceUserRef;
```

```ts
type NullableUser = User | null;

export function readUser(): NullableUser {
  return null;
}
```

```ts
const sorted = items.sort((left, right) => right.score - left.score);
```

```ts
export function readUser(): User | null {
  return null;
}
```

**Bad**

```ts
const userRef: { id: string } = sourceUserRef;
```

```ts
const pairs: Array<[string, number]> = Object.entries(counts);
```

```ts
export function readUser(): User | Admin | null {
  return null;
}
```

## Template literal readability policies

### `@alexgorbatchev/require-template-indent`

**Policy:** Multiline template literals that begin on their own line must keep their content indented with the surrounding code. Under-indented template content is hard to review, easy for agents to generate inconsistently, and obscures whether leading whitespace is intentional.

**Good**

```ts
const configSource = `
  export default {
    mode: "strict",
  };
`;
```

**Bad**

```ts
const configSource = `
export default {
  mode: "strict",
};
`;
```

## Type/value boundary policies

### `@alexgorbatchev/index-file-contract`

**Policy:** `index.ts` is a pure barrel entrypoint. It must not define local symbols, execute side-effect statements, or use the `index.tsx` filename. Every top-level statement must be a re-export from another module.

**Good**

```ts
export { createUser } from "./createUser";
export { default as UserService } from "./UserService";
export type { UserConfig } from "./types";
```

**Bad**

```tsx
import "./register";

export function UserService() {
  return <section />;
}
```

### `@alexgorbatchev/no-type-imports-from-constants`

**Policy:** Files may not import types from modules whose filename is `constants`. Runtime constants belong in
`constants.ts`; exported types belong in `types.ts`.

**Good**

```ts
import { USER_STATUS } from "./constants";
import type { UserStatus } from "./types";

type UserStatusModule = typeof import("./types");
```

**Bad**

```ts
import type { UserStatus } from "./constants";

type UserStatusModule = typeof import("./constants");
```

### `@alexgorbatchev/no-type-exports-from-constants`

**Policy:** A `constants.ts` file may export runtime values only. Exported type aliases, interfaces, and type re-exports
must live in `types.ts`.

**Good**

```ts
export const USER_STATUS = {
  active: "active",
};
```

**Bad**

```ts
export type UserStatus = "active" | "disabled";
```

### `@alexgorbatchev/no-value-exports-from-types`

**Policy:** A `types.ts` file may export type-only API only. Runtime values, default exports, and value re-exports must
move to `constants.ts` or another implementation module.

**Good**

```ts
export type UserStatus = "active" | "disabled";

export interface IUserStatusMap {
  active: string;
}
```

**Bad**

```ts
export const USER_STATUS = {
  active: "active",
};

export { USER_STATUS } from "./constants";
```

## React component policies

### `@alexgorbatchev/testid-naming-convention`

**Policy:** In non-story `.tsx` files, React test ids must always be scoped to the file's component name: root ids use
`ComponentName`, and child ids use `ComponentName--thing`. Storybook files are exempt because their harnesses are not
ownership components.

**Good**

```tsx
function SignalPanel() {
  return (
    <section data-testid="SignalPanel">
      <span data-testid="SignalPanel--label">Ready</span>
    </section>
  );
}
```

**Bad**

```tsx
function SignalPanel() {
  return (
    <section data-testid="panel-root">
      <span data-testid="label">Ready</span>
    </section>
  );
}
```

### `@alexgorbatchev/no-react-create-element`

**Policy:** Regular application code must use JSX, not `createElement`.

**Good**

```tsx
export function SignalPanel() {
  return <section data-testid="SignalPanel" />;
}
```

**Bad**

```tsx
import { createElement } from "react";

export function SignalPanel() {
  return createElement("section", { "data-testid": "SignalPanel" });
}
```

### `@alexgorbatchev/require-component-root-testid`

**Policy:** In non-story `.tsx` files, exported React components that render a direct DOM root must set that root's `data-testid`/`testId` to exactly the component name, and every child test id must use `ComponentName--thing`. Fragment roots and other non-JSX-expression roots are not allowed for exported components. Exported components may delegate their root rendering to another React component without adding a root test id at the call site. Storybook files are exempt because story exports are not component ownership files.

**Good**

```tsx
export function SurfacePanel() {
  return (
    <section data-testid="SurfacePanel">
      <div data-testid="SurfacePanel--content">Ready</div>
    </section>
  );
}
```

```tsx
export function KitchenSinkTaskDetailView() {
  return <CompactSurfaceSummary label="Task Detail View" entityType="issue" />;
}
```

**Bad**

```tsx
export function SurfacePanel() {
  return (
    <>
      <div data-testid="WrongPanel--content">Ready</div>
    </>
  );
}
```

### `@alexgorbatchev/component-file-contract`

**Policy:** A component ownership file may export exactly one main runtime component plus unrestricted type-only API, or one multipart component family plus unrestricted type-only API. Multipart families are allowed when every runtime export is a valid component export and all component names share the same shortest root name, such as `Select`, `SelectTrigger`, and `SelectValue`. Plain components must use `export function ComponentName() {}`. Wrapped components must use a direct named `export const` binding whose innermost function expression is named and matches the exported symbol.

**Good**

```tsx
export function Button() {
  return <button />;
}
```

```tsx
export const Button = memo(function Button() {
  return <button />;
});
```

```tsx
export function SelectTrigger() {
  return <button />;
}

export function Select() {
  return <button />;
}

export function SelectValue() {
  return <span />;
}
```

**Bad**

```tsx
export const Button = () => <button />;
```

```tsx
export const Button = memo(function RenderButton() {
  return <button />;
});
```

```tsx
function Avatar() {
  return <div />;
}

export { Avatar };
```

### `@alexgorbatchev/component-file-naming-convention`

**Policy:** The exported component name must be PascalCase, and the filename must match it as either `ComponentName.tsx` or `component-name.tsx`. For allowed multipart component families, the filename must match the shared root component name.

### `@alexgorbatchev/component-story-file-convention`

**Policy:** Every component ownership file must have a matching `basename.stories.tsx` file somewhere under a sibling
`stories/` directory. The component may sit in any folder; the hard requirement is that its Storybook coverage lives
under `stories/`.

### `@alexgorbatchev/story-file-location-convention`

**Policy:** A story file must live somewhere under a sibling `stories/` directory and must map back to a sibling
component ownership file by basename.

**Good**

```text
src/accounts/AccountPanel.tsx
src/accounts/stories/AccountPanel.stories.tsx
src/accounts/account-panel.tsx
src/accounts/stories/catalog/account-panel.stories.tsx
```

**Bad**

```text
src/accounts/AccountPanel.stories.tsx
src/accounts/catalog/AccountPanel.stories.tsx
```

### `@alexgorbatchev/story-meta-type-annotation`

**Policy:** Storybook files must bind their default-exported meta object as a top-level `const meta: Meta<typeof
ComponentName> = { ... }`. Do not use object assertions or rely on inference for the meta contract.

**Good**

```tsx
const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
};

export default meta;
```

**Bad**

```tsx
const meta = {
  component: AccountPanel,
} as Meta<typeof AccountPanel>;

export default meta;
```

### `@alexgorbatchev/story-export-contract`

**Policy:** After the default meta, exported runtime object bindings are treated as stories. Story exports must use
typed `Story` bindings, every exported story must define a `play` property, and the export shape depends on story count:

- single story: `const Default: Story = { ... }; export { Default as ComponentName };`
- multiple stories: `export const StoryName: Story = { ... };`

**Good**

```tsx
const Default: Story = {
  play: async () => {},
};

export { Default as AccountPanel };
```

```tsx
export const Default: Story = {
  play: async () => {},
};

export const WithProps: Story = {
  args: { isReady: true },
  play: async () => {},
};
```

**Bad**

```tsx
export const Default: Story = {
  play: async () => {},
};
```

```tsx
const Default = {} as Story;
export { Default as AccountPanel };
```

### `@alexgorbatchev/hook-file-contract`

**Policy:** A hook ownership file may export exactly one main runtime hook plus unrestricted type-only API. The main
hook export must be a plain named function declaration: `export function useThing() {}`.

**Good**

```ts
export function useAccount() {
  return null;
}
```

**Bad**

```ts
export const useAccount = () => null;
```

```ts
export const useAccount = trace(function useAccount() {
  return null;
});
```

### `@alexgorbatchev/hook-file-naming-convention`

**Policy:** Hook ownership files must use matching `useFoo.ts[x]` or `use-foo.ts[x]` basenames, and the exported hook
name must match the filename's camelCase conversion exactly.

### `@alexgorbatchev/hook-test-file-convention`

**Policy:** Every hook ownership file must have a matching `basename.test.ts` or `.test.tsx` file somewhere under a
sibling `__tests__/` directory, and the test extension must still match the source extension.

## Test execution and layout policies

### `@alexgorbatchev/no-non-running-tests`

**Policy:** Ban the non-running test forms that the upstream Jest rules do not cover, such as gated `.if`, `.skipIf`,
and `.todo` variants.

**Good**

```ts
describe("SignalPanel", () => {
  it("renders", () => {});
});
```

**Bad**

```ts
test.skipIf(process.env.CI === "true")("renders", () => {});
```

### `@alexgorbatchev/no-conditional-logic-in-tests`

**Policy:** Committed `*.test.ts` and `*.test.tsx` files must not branch with `if`, `switch`, or ternary control flow. Branching test logic can skip assertions or hide which path a test truly exercises. Use `assert(...)` for narrowing or failure instead of conditional control flow.

**Good**

```ts
import assert from "node:assert";

test("reads the failure path", () => {
  const result = { error: "failed", success: false };

  assert(!result.success);
  expect(result.error).toBe("failed");
});
```

**Bad**

```ts
test("reads the failure path", () => {
  const result = { error: "failed", success: false };

  if (!result.success) {
    expect(result.error).toBe("failed");
  }
});
```

### `@alexgorbatchev/no-throw-in-tests`

**Policy:** Committed `*.test.ts` and `*.test.tsx` files must not use `throw new Error(...)` as an ad-hoc failure path. Throwing inside the test body obscures intent and bypasses the explicit assertion contract. Use `assert(...)` or `assert.fail(...)` from `node:assert` instead.

**Good**

```ts
import assert from "node:assert";

test("fails explicitly", () => {
  assert.fail("unexpected state");
});
```

**Bad**

```ts
test("fails explicitly", () => {
  throw new Error("unexpected state");
});
```

### `@alexgorbatchev/no-module-mocking`

**Policy:** Inside `__tests__/`, do not mock entire modules. Pass collaborators into the unit under test and stub the
injected dependency instead.

**Good**

```ts
const fetchUser = async () => ({ id: "user-1" });
const fetchUserStub = async () => ({ id: "user-2" });

await runScenario({ fetchUser: fetchUserStub });
```

**Bad**

```ts
import { vi } from "vitest";

vi.mock("./userGateway", () => ({
  fetchUser: vi.fn(),
}));
```

### `@alexgorbatchev/no-test-file-exports`

**Policy:** `*.test.ts` and `*.test.tsx` are execution units, not shared modules. Shared helpers belong in
`helpers.ts`, `fixtures.ts`, or `fixtures/`.

**Good**

```ts
import { renderSignalPanel } from "./helpers";

test("renders", () => {
  renderSignalPanel();
});
```

**Bad**

```ts
export const renderSignalPanel = () => null;
```

### `@alexgorbatchev/no-imports-from-tests-directory`

**Policy:** Files outside `__tests__/` must not import, require, or re-export any module from a `__tests__/`
directory. Test-only helpers and fixtures must not leak into runtime or shared production modules.

**Good**

```ts
import { renderSignalPanel } from "./renderSignalPanel";
```

**Bad**

```ts
import { renderSignalPanel } from "./__tests__/helpers";
```

### `@alexgorbatchev/test-file-location-convention`

**Policy:** `.test.ts` and `.test.tsx` files that represent repository-owned tests must live under a `__tests__/` directory.
This is a global ingress rule: it intentionally runs outside `__tests__/` so misplaced `.test.ts[x]` files are told
where to move. `.spec.ts` and `.spec.tsx` files are out of scope for this rule and are ignored.

**Companion semantic fix:** From this repository root, `bun run fix:semantic -- <target-directory>` can move misplaced
`.test.ts` / `.test.tsx` files into a sibling `__tests__/` directory as `__tests__/basename.test.ts[x]`. The fixer is
intentionally conservative: it only handles already-canonical `.test.ts[x]` basenames, rewrites the moved file's
relative imports, and skips the move if the canonical destination already exists.

**Good**

```text
src/widgets/
├── SignalPanel.tsx
└── __tests__/
    └── SignalPanel.test.tsx
```

**Bad**

```text
src/widgets/
├── SignalPanel.tsx
└── SignalPanel.test.tsx
```

## Fixture system policies

### `@alexgorbatchev/fixture-file-contract`

**Policy:** Any nested `fixtures.ts` or `fixtures.tsx` entrypoint under `__tests__/` or `stories/` may export only
direct named `const` fixture bindings and direct named factory functions. No default exports, re-export lists, `let`,
or destructured export patterns.

**Good**

```ts
export const fixture_userAccountRows = [{ id: "1" }];

export function factory_userAccountRows() {
  return [{ id: "1" }];
}
```

**Bad**

```ts
const fixture_userAccountRows = [{ id: "1" }];

export { fixture_userAccountRows };
```

### `@alexgorbatchev/fixture-export-naming-convention`

**Policy:** Fixture entrypoint exports must use `fixture_<lowerCamelCase>` for constant fixtures and
`factory_<lowerCamelCase>` for factory functions.

**Good**

```ts
export const fixture_userAccountRows = [{ id: "1" }];

export function factory_userAccountRows() {
  return [{ id: "1" }];
}
```

**Bad**

```ts
export const userAccountRows = [{ id: "1" }];

export function makeUserAccountRows() {
  return [{ id: "1" }];
}
```

### `@alexgorbatchev/fixture-export-type-contract`

**Policy:** Fixture entrypoint exports must declare explicit concrete types imported from outside the fixture file. Do
not omit the contract, and do not use `any` or `unknown`.

**Good**

```ts
import type { UserRow } from "../UserRow";

export const fixture_userAccountRows: UserRow[] = [];

export function factory_userAccountRows(): UserRow[] {
  return [];
}
```

**Bad**

```ts
export const fixture_userAccountRows: any[] = [];

export function factory_userAccountRows() {
  return [];
}
```

### `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint`

**Policy:** `fixture_*` and `factory_*` exports may exist only in nested `fixtures.ts` or `fixtures.tsx`
entrypoints under `__tests__/` or `stories/`. This is a global leak-prevention rule: it intentionally runs outside
those directories so misplaced fixture exports are rejected at the point they escape.

**Good**

```ts
// src/accounts/__tests__/fixtures.ts
export const fixture_userAccountRows = [{ id: "1" }];
```

**Bad**

```ts
// src/accounts/buildRows.ts
export const fixture_userAccountRows = [{ id: "1" }];
```

### `@alexgorbatchev/no-inline-fixture-bindings-in-tests`

**Policy:** Test files must import `fixture_*` and `factory_*` bindings from `./fixtures` instead of declaring them
inline.

**Good**

```ts
import { factory_userAccountRows, fixture_userAccountRows } from "./fixtures";

test("uses imported fixtures", () => {
  expect(fixture_userAccountRows).toBeDefined();
  expect(factory_userAccountRows()).toBeDefined();
});
```

**Bad**

```ts
const fixture_userAccountRows = [{ id: "1" }];

function factory_userAccountRows() {
  return [{ id: "1" }];
}
```

### `@alexgorbatchev/fixture-import-path-convention`

**Policy:** When a test or story imports `fixture_*` or `factory_*` bindings, the import must be a named import
from a relative `fixtures` module inside the same `__tests__/` or `stories/` tree, with no aliasing and no alternate
filename.

**Good**

```ts
import { factory_userAccountRows, fixture_userAccountRows } from "./fixtures";
```

**Bad**

```ts
import { fixture_userAccountRows as userAccountRows } from "./fixtures";
import { factory_userAccountRows } from "./fixtures.ts";
```

### `@alexgorbatchev/no-local-type-declarations-in-fixture-files`

**Policy:** Fixture files must import shared types instead of declaring local type aliases, interfaces, or enums in a
fixture entrypoint or anywhere inside a nested `fixtures/` directory.

**Good**

```ts
import type { UserRow } from "../UserRow";

export const fixture_userAccountRows: UserRow[] = [];
```

**Bad**

```ts
type UserRow = { id: string };

export const fixture_userAccountRows: UserRow[] = [];
```

### `@alexgorbatchev/single-fixture-entrypoint`

**Policy:** Each fixture-support directory under `__tests__/` or `stories/` must choose exactly one fixture
entrypoint shape so `./fixtures` stays unambiguous: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`.

**Good**

```text
src/accounts/__tests__/
├── rows.test.ts
└── fixtures.ts
```

**Bad**

```text
src/accounts/__tests__/
├── rows.test.ts
├── fixtures.ts   <-
└── fixtures/     <-
    └── rows.ts
```
