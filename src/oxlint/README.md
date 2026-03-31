# Oxlint policy pack

This package ships a shared Oxlint config plus a local JS plugin that encodes repository policy for agentic coding
workflows.

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

1. **Global ingress and leak guards** run everywhere because they must catch files that are not yet in the canonical
   location:
   - `@alexgorbatchev/no-imports-from-tests-directory`
   - `@alexgorbatchev/no-type-imports-from-constants`
   - `@alexgorbatchev/test-file-location-convention`
   - `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint`
2. **Filename-addressable file-role rules** run only on the exact file role they govern:
   - `@alexgorbatchev/index-file-contract` on `**/index.ts` and `**/index.tsx`
   - `@alexgorbatchev/no-type-exports-from-constants` on `**/constants.{ts,tsx,mts,cts}` and `**/constants.d.{ts,tsx,mts,cts}`
   - `@alexgorbatchev/no-value-exports-from-types` on `**/types.{ts,tsx,mts,cts}` and `**/types.d.{ts,tsx,mts,cts}`
3. **`__tests__/` directory rules** run only inside `__tests__/` because they govern that directory's allowed contents
   and test helper behavior:
   - `@alexgorbatchev/tests-directory-file-convention`
   - `@alexgorbatchev/no-module-mocking`
4. **Canonical test-file rules** run only on `__tests__/*.test.ts` and `__tests__/*.test.tsx`:
   - `@alexgorbatchev/no-non-running-tests`
   - `@alexgorbatchev/no-test-file-exports`
   - `@alexgorbatchev/no-inline-fixture-bindings-in-tests`
   - `@alexgorbatchev/fixture-import-path-convention`
   - `jest/no-disabled-tests`
   - `jest/no-focused-tests`
5. **Fixture-entrypoint and fixture-area rules** run only on `__tests__/fixtures.ts`, `__tests__/fixtures.tsx`, and
   files under `__tests__/fixtures/`, depending on the rule.

This staged configuration is part of the contract. The naming/location rule is the front door that steers misplaced
files into canonical `__tests__/*.test.ts[x]` form; basename-addressable file-role rules such as `index.ts`,
`constants.ts`, and `types.ts` are scoped by `overrides`; and the narrower overrides then enforce the rest of the
policy only after a file has the correct role.

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

**Policy:** React test ids must always be scoped to the file's component name: root ids use `ComponentName`, and child
ids use `ComponentName--thing`.

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

**Policy:** Exported React components must render a DOM root whose `data-testid`/`testId` is exactly the component
name, and every child test id must use `ComponentName--thing`. Fragment roots and other non-element roots are not
allowed for exported components.

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

**Policy:** Real test files must live in a sibling `__tests__/` directory and must end in `.test.ts` or `.test.tsx`.
This is a global ingress rule: it intentionally runs outside `__tests__/` so misplaced or misnamed test files are told
where to move.

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
└── SignalPanel.spec.tsx
```

### `@alexgorbatchev/tests-directory-file-convention`

**Policy:** A `__tests__/` directory may contain only `*.test.ts`, `*.test.tsx`, `helpers.ts`, `helpers.tsx`,
`fixtures.ts`, `fixtures.tsx`, or files under `fixtures/`.

**Good**

```text
src/widgets/__tests__/
├── SignalPanel.test.tsx
├── helpers.ts
└── fixtures/
    └── snapshots/SignalPanel.json
```

**Bad**

```text
src/widgets/__tests__/
├── setup.ts
└── subdir/SignalPanel.test.ts
```

## Fixture system policies

### `@alexgorbatchev/fixture-file-contract`

**Policy:** The `__tests__/fixtures.ts` or `__tests__/fixtures.tsx` entrypoint may export only direct named `const`
fixture bindings and direct named factory functions. No default exports, re-export lists, `let`, or destructured export
patterns.

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

**Policy:** `fixture_*` and `factory_*` exports may exist only in the dedicated `__tests__/fixtures.ts` or
`__tests__/fixtures.tsx` entrypoint. This is a global leak-prevention rule: it intentionally runs outside `__tests__/`
so misplaced fixture exports are rejected at the point they escape.

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

**Policy:** When a test imports `fixture_*` or `factory_*` bindings, the import must be a named import from the
colocated `./fixtures` module, with no aliasing and no alternate path.

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

**Policy:** Fixture files must import shared types instead of declaring local type aliases, interfaces, or enums in the
fixture entrypoint or inside `fixtures/`.

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

**Policy:** Each `__tests__/` directory must choose exactly one fixture entrypoint shape so `./fixtures` stays
unambiguous: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`.

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
