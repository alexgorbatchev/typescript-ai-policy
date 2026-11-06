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

When a rule reports a file-level contract violation, it should anchor the diagnostic to the first top-level syntax node
when possible instead of the `Program` node so editor UIs do not highlight the whole file.

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

## Agent guidance output

Each local `@alexgorbatchev/*` rule exposes an authoritative `meta.docs.guidance` string in its own rule module in
addition to its description and lint messages.

Use the package CLI to print those guidance strings for AI agents as a wrapped Markdown bullet list with bold rule
names or as JSON:

```bash
bun run typescript-ai-policy -- guidance
```

```bash
bun run typescript-ai-policy -- guidance --json
```

The published guidance output is package-level contract guidance, not a repository-specific config dump. Treat that
output as the package-level contract, then reconcile it with the consuming repository's actual canonical component,
story, hook, and test ownership layout before applying file-specific repairs.

## Enforcement model

The shared config intentionally applies the policy in stages so Oxlint does not waste time running file-specific rules
on files that cannot meaningfully violate them.

1. **Global ingress and leak guards** run everywhere because they must catch files that are not yet in the required
   role directories:
   - `@alexgorbatchev/no-imports-from-tests-directory`
   - `@alexgorbatchev/no-type-imports-from-constants`
   - `@alexgorbatchev/hook-export-location-convention`
   - `@alexgorbatchev/test-file-location-convention`
   - `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint`
   - `@alexgorbatchev/no-lint-disable-comments`
2. **TypeScript-wide naming, indirection, explicit-type, and template-literal rules** run on all `**/*.{ts,tsx,mts,cts}` files:
   - `@alexgorbatchev/interface-naming-convention`
   - `@alexgorbatchev/no-i-prefixed-type-aliases`
   - `@alexgorbatchev/no-trivial-forwarding-function`
   - `@alexgorbatchev/no-direct-interface-to-type-assignment`
   - `@alexgorbatchev/no-inline-type-expressions`
   - `@alexgorbatchev/no-inline-type-imports`
   - `@alexgorbatchev/require-template-indent`
   - `@alexgorbatchev/no-arbitrary-child-selectors`
3. **React component ownership rules** run on all `**/*.tsx` files unless a narrower file-role override disables
   them:
   - `@alexgorbatchev/no-intrinsic-elements-outside-component-globs`
   - `@alexgorbatchev/no-classname-style-props-outside-component-globs`
   - `@alexgorbatchev/testid-naming-convention`
   - `@alexgorbatchev/require-component-root-testid`
   - `@alexgorbatchev/component-file-location-convention`
   - `@alexgorbatchev/component-file-contract`
   - `@alexgorbatchev/component-file-naming-convention`
   - `@alexgorbatchev/component-story-file-convention`
   - The contract, location, and story rules recognize module-only `main.tsx` React bootstraps outside component
     ownership directories. Recognition requires an imported `react-dom/client` `createRoot` call followed by a
     top-level JSX render, with no exports or local component declarations. Other checks remain active.
4. **Canonical component-area directory rules** run only under `**/components/**/*`, `**/templates/**/*`, and `**/layouts/**/*`:
   - `@alexgorbatchev/component-directory-file-convention`
5. **Story-area compatibility overrides** run on all `**/stories/**/*.tsx` files:
   - story-support `.tsx` files explicitly turn off the component-ownership rules (`@alexgorbatchev/component-file-location-convention`, `@alexgorbatchev/testid-naming-convention`, `@alexgorbatchev/require-component-root-testid`, `@alexgorbatchev/component-file-contract`, `@alexgorbatchev/component-file-naming-convention`, and `@alexgorbatchev/component-story-file-convention`) because story helpers and fixtures are not component ownership files
6. **Storybook project-support compatibility overrides** run on `**/.storybook/*.tsx` and `**/.storybook/**/*.tsx`:
   - Storybook config, manager, preview, and decorator `.tsx` files explicitly turn off component ownership, raw-intrinsic, and direct-styling ownership rules because `.storybook/` support files are framework harness files, not product component ownership files
7. **Storybook file rules** run only on `**/*.stories.tsx`:
   - story files explicitly turn off the same component-ownership rules so misplaced `*.stories.tsx` leaves still report with story-specific diagnostics instead of component-owner diagnostics
   - `@alexgorbatchev/story-file-location-convention`
   - `@alexgorbatchev/story-meta-type-annotation`
   - `@alexgorbatchev/story-title-convention`
   - `@alexgorbatchev/story-export-contract`
   - `@alexgorbatchev/no-inline-fixture-bindings-in-tests`
   - `@alexgorbatchev/fixture-import-path-convention`
8. **Stories-directory rules** run anywhere under `**/stories/**/*`:
   - `@alexgorbatchev/stories-directory-file-convention`
9. **`__tests__`-area compatibility overrides** run on all `**/__tests__/**/*.tsx` files:
   - test-support `.tsx` files explicitly turn off the same component-ownership rules because test helpers and fixtures are not component ownership files
10. **Basename-addressable `.test.tsx` file-role compatibility overrides** run on `**/*.test.tsx`:

- these files explicitly turn off the same component-ownership rules because a basename-addressable test file is still a test role even when misplaced and should be reported by `@alexgorbatchev/test-file-location-convention` instead of component-ownership rules

11. **Hook ownership rules** run on the configured ownership filename globs, with rule-level backstops that skip `__tests__/`, `stories/`, and exempt support basenames:

- default `filenameStyle: FilenameStyle.PascalCase`: `**/use[A-Z]*.ts`, `**/use[A-Z]*.tsx`
- optional `filenameStyle: FilenameStyle.DashCase`: `**/use-*.ts`, `**/use-*.tsx`

- hook ownership files explicitly turn off component naming, location, export-contract, test-id, and sibling-story rules; `.tsx` hook files retain the shared raw-intrinsic JSX and direct-styling boundaries

- `@alexgorbatchev/hook-file-contract`
- `@alexgorbatchev/hook-file-naming-convention`
- `@alexgorbatchev/hook-test-file-convention`

12. **Hooks-directory rules** run anywhere under `**/hooks/**/*`:

- `@alexgorbatchev/hooks-directory-file-convention`

13. **Filename-addressable file-role rules** run only on the exact file role they govern:

- `@alexgorbatchev/index-file-contract` on `**/index.ts` and `**/index.tsx`
- `@alexgorbatchev/no-type-exports-from-constants` on `**/constants.{ts,tsx,mts,cts}` and `**/constants.d.{ts,tsx,mts,cts}`
- `@alexgorbatchev/no-value-exports-from-types` on `**/types.{ts,tsx,mts,cts}` and `**/types.d.{ts,tsx,mts,cts}`

14. **`__tests__/` area rules** run anywhere under `**/__tests__/**`:

- `@alexgorbatchev/no-module-mocking`
- `@alexgorbatchev/tests-directory-file-convention`

15. **Test-file rules** run on `__tests__/**/*.test.ts` and `__tests__/**/*.test.tsx`:

- test files explicitly turn off `@alexgorbatchev/testid-naming-convention` and `@alexgorbatchev/require-component-root-testid` because test harnesses are not ownership components
- `@alexgorbatchev/no-non-running-tests`
- `@alexgorbatchev/no-conditional-logic-in-tests`
- `@alexgorbatchev/no-throw-in-tests`
- `@alexgorbatchev/no-test-file-exports`
- `@alexgorbatchev/no-inline-fixture-bindings-in-tests`
- `@alexgorbatchev/fixture-import-path-convention`
- `jest/no-disabled-tests`
- `jest/no-focused-tests`

16. **Fixture-entrypoint and fixture-area rules** run on nested `fixtures.ts`, `fixtures.tsx`, and `fixtures/`
    directories anywhere under `__tests__/` or `stories/`, depending on the rule.

This staged configuration is part of the contract. Global rules protect ingress and leak paths; canonical role
directories establish component ownership (`components/`, `templates/`, `layouts/`), stories (`stories/`), exported
hooks (`hooks/`), and tests (`__tests__/`). Component areas may contain canonical story, test, and hook subtrees, which
remain subject to their respective role rules. Story, Storybook project-support, and test support `.tsx` files are
carved out of component-owner rules and retain their raw DOM styling allowance. The verified native-primitive styling
allowance applies only to runtime component implementations. These distinctions require no additional factory option
or consumer-configured scope.

## Enabled rules

This section covers the active error rules in the shared config. Some rules are global and some are activated only by
file-pattern overrides. `no-console` is explicitly disabled, and the `jsx-a11y` plugin is not enabled, so no
`jsx-a11y/*` rules are part of the policy surface.

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

### `react/exhaustive-deps`

**Policy:** Include every reactive value read by an effect, memo, or callback in its dependency list.
Missing dependencies are errors in the shared config, using Oxlint’s native React plugin.
Consumers must remove local entries for `react/exhaustive-deps` or its `react-hooks/exhaustive-deps` alias.

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

## Global enforcement policies

### `@alexgorbatchev/no-lint-disable-comments`

**Policy:** Do not use inline lint-disable comments for ESLint or Oxlint. Fix the code to satisfy the shared policy instead of bypassing it locally.

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

**Companion semantic fix:** From this repository root, `just fix-semantic <target-directory>` can apply supported interface renames through the `tsc` LSP backend. The fixer is intentionally conservative: it only applies mechanical renames when the current interface name can be normalized safely to `I[A-Z][A-Za-z0-9]*`.

### `@alexgorbatchev/no-i-prefixed-type-aliases`

**Policy:** Type aliases must not use the interface-style `I[A-Z]` prefix. This rule applies only to `type` aliases; it
does not change the repository's separate interface naming contract.

**Good**

```ts
export type UserProfile = {
  id: string;
};
```

```ts
export type Id = string;
```

**Bad**

```ts
export type IUserProfile = {
  id: string;
};
```

```ts
export type IURLConfig = {
  href: string;
};
```

**Companion semantic fix:** From this repository root, `just fix-semantic <target-directory>` can apply supported type-alias renames through the `tsc` LSP backend. The fixer is intentionally conservative: it only drops the leading `I` when the diagnostic resolves to a concrete `type` alias name that already matches the repository's banned `I[A-Z][A-Za-z0-9]*` shape.

### `@alexgorbatchev/no-direct-interface-to-type-assignment`

**Policy:** Do not create useless passthrough type aliases for interfaces (e.g. `type MyType = IMyType`). Direct assignments provide no type-level benefit and add unnecessary indirection.

**Good**

```ts
export type UserProfile = Omit<IUserProfile, "id">;
```

```ts
export type Id = string;
```

**Bad**

```ts
export type UserProfile = IUserProfile;
```

## Function indirection policy

### `@alexgorbatchev/no-trivial-forwarding-function`

**Policy:** Do not keep top-level function declarations or variable-assigned function wrappers whose entire body only returns a forwarded property read when the function name merely restates the selected property. Exported status does not justify a wrapper on its own; either inline the property access or give the function real ownership logic. The current rule scope intentionally targets simple property-selector wrappers that forward identifier or rest parameters in declaration order and end with the selected property name.

**Good**

```ts
export function readComponentEditor(value: string): string {
  return value.trim();
}
```

```ts
export function readComponentEditor(config: { componentEditor: string }): string {
  if (config.componentEditor === "") {
    return "fallback";
  }

  return config.componentEditor;
}
```

**Bad**

```ts
export function readDevtoolsComponentEditor(): DevtoolsComponentEditor {
  return readInjectedDevtoolsConfig().componentEditor;
}
```

```ts
export const readUserName = (userId: string): string => fetchUser(userId).name;
```

## Explicit type-expression policies

### `@alexgorbatchev/no-inline-type-imports`

**Policy:** Do not use inline type imports (`import('...').Type`). Import the type explicitly at the top of the file instead. `typeof import(...)` is allowed for extracting full module shapes.

**Good**

```ts
import type { PluginOption } from "vite";

const plugin: PluginOption = {};
```

```ts
type ViteModule = typeof import("vite");
```

**Bad**

```ts
const plugin: import("vite").PluginOption = {};
```

```ts
type PluginOption = import("vite").PluginOption;
```

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

**Policy:** Multiline template literals that begin on their own line must keep their content indented with the surrounding code. Under-indented template content is hard to review, easy for agents to generate inconsistently, and obscures whether leading whitespace is intentional. If indentation is significant, normalize the string explicitly with `@alexgorbatchev/dedent-string` instead of relying on under-indented source text.

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

### Canonical component ownership areas

The shared config derives the component-owned TSX surface from canonical directories instead of consumer-provided globs.

- component ownership `.tsx` files live under `components/`, `templates/`, or `layouts/`
- nested subdirectories inside those areas are allowed but not required
- canonical `stories/`, `__tests__/`, and `hooks/` subtrees keep their own strict role rules
- `stories/` trees may group stories by function independently of runtime component folders
- raw intrinsic JSX belongs in component areas, with the existing story, test, and Storybook support allowances;
  the [styling rule](#alexgorbatchevno-classname-style-props-outside-component-globs) also recognizes verified native
  Base UI primitives in runtime component implementations

### Resolving story ownership

A story belongs to the runtime component resolved from its default-exported, top-level
`const meta: Meta<typeof Component> = { component: Component, ... }`. The typed reference and effective `component`
property must resolve to the same source file **and symbol**. Two different exports from one file do not satisfy
that equality. Named imports, import aliases, namespace members, resolvable local const aliases, and barrel
re-exports can establish ownership; a title, catalog group, or matching filename alone cannot.

The story must be under a `stories/` tree in the same canonical component area and nearest package as the resolved
runtime `.tsx` owner. Nested `package.json` boundaries are respected. Stories, tests, hooks, fixtures, and support
modules cannot own component stories. The story basename matches the **source file** basename, including for compound
parts: a story bound to `Panel.Header` from `Panel.tsx` uses `Panel.stories.tsx`. Matching filenames elsewhere in the
area do not let one story cover multiple owners.

Wrapped compound exports such as `Object.assign(function Panel() { ... }, { Header })` resolve each part to its
actual source binding. The native `Object.assign` call must have an unshadowed, unmodified binding and a fresh
function-expression target. Stable local object sources, their const aliases and spreads, and later-source
precedence are supported. Getters, unresolved computed keys, prototype-changing keys, spread call arguments,
and unknown target factories do not establish ownership. The returned function retains its own identity for
mutation checks, including aliases and its named self-binding. This follows native shallow-copy semantics:
ordinary source properties are copied, while nested values retain shared identity.
The source-copy exemption requires the entire call to remain safe. A modified built-in, unsafe source, or
prototype-changing key makes every supplied source escape; ownership through that source is rejected too.
That requirement includes each source behind const aliases and nested spreads, regardless of mutation-discovery order.
Visible mutations and escapes of `globalThis`, including const aliases, invalidate native-constructor assumptions.

Metadata resolution follows object-property order. Resolvable local const spreads participate; a later explicit
`component` property establishes the effective value, while an unknown later spread can invalidate it. Unresolved,
ambiguous, cyclic, malformed, or conflicting bindings do not establish ownership. Keep the typed and effective
component bindings explicit when the resolver cannot prove the relationship.

The resolver checks lexical binding identity with [`oxc-walker`](https://github.com/oxc-project/oxc-walker), including
shadowing and const aliases. It conservatively rejects visible property writes, deletion, updates, method calls,
and untracked escapes of metadata or compound objects. Accessor-bearing objects are unknown because evaluating a
getter can change later properties. This analysis is flow-insensitive: a visible mutation invalidates the object
without trying to prove execution order or whether a branch runs. Shallow spread copies have independent own
properties, but nested values retain shared identity. A later explicit `component` can override an unknown spread;
it cannot repair a mutation of the resulting metadata object. Ordinary reads and `typeof meta` do not invalidate it.

Imported aliases are compared by their resolved export identity. An unsafe namespace import conservatively
invalidates ownership through objects exported by that namespace, including barrels. Passing an extracted compound
member to external code also makes its containing object unknown; the analysis does not prove member-specific effects.

The package uses [`oxc-parser`](https://oxc.rs/docs/guide/usage/parser) and
[`oxc-resolver`](https://oxc.rs/docs/guide/usage/resolver) as runtime dependencies for counterpart parsing and module
resolution, including applicable TypeScript path aliases, JavaScript-to-TypeScript extension aliases, and re-exports.
Optional TypeScript compiler peers are not required for this analysis. Each rule invocation for a linted file creates
a fresh module graph and resolver, reads the current file from its lint context, and reads counterpart sources from
disk. Graph-local parsing and resolution state is discarded after that invocation; no process-wide ownership cache
hides later changes to components, barrels, package boundaries, or resolver configuration.

Module identity uses canonical filesystem paths so symlinked checkout paths share ownership and the current lint
buffer with their physical file. A buffer whose file does not exist yet keeps its absolute path.

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

### `@alexgorbatchev/no-intrinsic-elements-outside-component-globs`

**Policy:** Non-story, non-test, non-`.storybook/` `.tsx` files outside `components/`, `templates/`, and `layouts/` must
not render intrinsic JSX elements such as `<div>`, `<span>`, or lowercase custom elements. Move the raw DOM markup into a
component ownership file under one of those directories and render an imported component instead.

**Good**

```tsx
export function DashboardRoute() {
  return <DashboardShell />;
}
```

```tsx
export function DashboardShell() {
  return <div data-testid="DashboardShell" />;
}
```

**Bad**

```tsx
export function DashboardRoute() {
  return <div data-testid="DashboardRoute" />;
}
```

### `@alexgorbatchev/no-classname-style-props-outside-component-globs`

**Policy:** Direct `className` and `style` props belong on intrinsic elements in canonical component ownership areas,
or on verified native Base UI primitives in runtime component ownership files. Story, test, and `.storybook/` support
retain their intrinsic-element allowance. Product consumers outside those areas must use component-owned visual props;
styled custom components remain protected from direct styling everywhere.

Native recognition requires an installed `@base-ui/react` version **1.9.0**, a reviewed public root or subpath export,
and an exact reviewed primitive or part. It follows lexical import identity for named, renamed, and namespace imports;
shadowed names, default or type-only imports, local wrapper aliases, unknown symbols, product component re-exports,
and unsupported package versions do not qualify. A package name alone is insufficient. This allowance belongs to
runtime component implementations, not story, test, hook, fixture, or other support files.

Use Base UI's documented [`className` and `style` APIs](https://base-ui.com/react/handbook/styling), including their
state callbacks, within that ownership boundary. If explicit styling accompanies a
[`render` prop](https://base-ui.com/react/handbook/composition), every visible render link must resolve to an intrinsic
element or another verified native primitive. JSX elements and resolvable const element aliases can establish the
terminal. A styled product component, callback, props-supplied target, or unknown later spread cannot. Base UI's
composition API remains available without explicit styling; it does not permit styling a product component through
a native wrapper.

**Good**

```tsx
export function DashboardRoute() {
  return <DashboardShell tone="compact" />;
}
```

```tsx
export function DashboardShell() {
  return <div className="dashboard-shell" />;
}
```

```tsx
// src/components/Button.tsx; @base-ui/react 1.9.0
import { Button as BaseButton } from "@base-ui/react/button";

export function Button() {
  return <BaseButton className="button" data-testid="Button" />;
}
```

**Bad**

```tsx
export function DashboardRoute() {
  return <DashboardShell className="dashboard-shell" />;
}
```

```tsx
// A native wrapper cannot override a styled product component.
<BaseButton className="button" render={<ProductButton />} />
```

### `@alexgorbatchev/no-arbitrary-child-selectors`

**Policy:** Do not use arbitrary child or sibling selectors to style nested descendants or siblings. Use composition with separate components or explicit visual primitives instead.

**Good**

```tsx
export function Button({ icon }) {
  return (
    <button className="flex items-center gap-2">
      <Icon icon={icon} size="sm" />
    </button>
  );
}
```

**Bad**

```tsx
export function Button() {
  return (
    <button className="[&_svg]:w-4 [&_svg]:h-4">
      <CustomIcon />
    </button>
  );
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

To satisfy external interfaces (such as Next.js pages or lazy loading) that require a default export, you may add `export default ComponentName;` at the bottom of the file as a passthrough alias. Inline `export default function ComponentName()` remains forbidden because the primary contract requires a named component export.

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

```tsx
export function Page() {
  return <div />;
}

export default Page;
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

### `@alexgorbatchev/component-file-location-convention`

**Policy:** Non-hook, non-test `.tsx` ownership files must live under a `components/`, `templates/`, or `layouts/`
directory. This placement rule keeps component-owned TSX structurally discoverable instead of leaving ownership files as
arbitrary feature-local `.tsx` leaves.

### `@alexgorbatchev/component-directory-file-convention`

**Policy:** A `components/`, `templates/`, or `layouts/` area may contain component ownership `.tsx` files,
`constants.ts`, `index.ts`, and `types.ts`, including in nested feature directories. Canonical `stories/`, `__tests__/`,
and `hooks/` subtrees are delegated to their own role rules. This permits component-local tests and feature hooks
without permitting arbitrary runtime modules or malformed support files: `components/helpers.ts`,
`components/__tests__/types.ts`, and `components/hooks/utils.ts` remain invalid.

### `@alexgorbatchev/component-file-naming-convention`

**Policy:** The exported component name must be PascalCase, and the filename must match it in the configured form: `ComponentName.tsx` by default, or `component-name.tsx` when `filenameStyle: FilenameStyle.DashCase` is configured. For allowed multipart component families, the filename must match the shared root component name in that configured form. If a `.tsx` module is not actually a component ownership file, rename it to `.ts` instead of forcing it through the component-file contract.

### `@alexgorbatchev/component-story-file-convention`

**Policy:** Every runtime component ownership file must have a matching `basename.stories.tsx` under a `stories/`
tree in the same package and canonical component area. The story's typed meta and effective `component` property
must resolve to that exact owner. Functional catalog groups and feature-local story trees are both supported;
a same-named story for another component does not count. See [resolving story ownership](#resolving-story-ownership).

### `@alexgorbatchev/stories-directory-file-convention`

**Policy:** Each functional group under `stories/` may contain only `*.stories.tsx`, `helpers.ts`, `helpers.tsx`,
`fixtures.ts`, `fixtures.tsx`, or files under `fixtures/`. Groups may nest and have local helpers and fixture support;
fixture directories may contain descendants. Existing fixture entrypoint, export, and import rules still apply.
Grouping does not admit runtime modules, tests, or arbitrary support filenames into the story tree.

### `@alexgorbatchev/story-file-location-convention`

**Policy:** A story file must live under a `stories/` tree, match its resolved component source basename, and satisfy
the same-package, same-area, exact-binding [ownership contract](#resolving-story-ownership). The catalog group does
not need to mirror the runtime directory.

**Good**

```text
src/components/accounts/AccountPanel.tsx
src/components/stories/forms/AccountPanel.stories.tsx
src/components/accounts/account-panel.tsx
src/components/accounts/stories/account-panel.stories.tsx
```

For the first pair, the story establishes ownership through its import and typed meta:

```tsx
import type { Meta } from "@storybook/react";
import { AccountPanel } from "../../accounts/AccountPanel";

const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
  title: "@scope/ui/components/forms/AccountPanel",
};

export default meta;
```

**Bad**

```text
src/accounts/components/AccountPanel.stories.tsx
src/accounts/components/catalog/AccountPanel.stories.tsx
```

### `@alexgorbatchev/story-meta-type-annotation`

**Policy:** Storybook files must bind their default-exported meta object as a top-level `const meta: Meta<typeof
ComponentName> = { ... }`. Do not use object assertions or rely on inference for the meta contract.

**Good**

```tsx
const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
  title: "accounts/AccountPanel",
};

export default meta;
```

**Bad**

```tsx
const meta = {
  component: AccountPanel,
  title: "accounts/AccountPanel",
} as Meta<typeof AccountPanel>;

export default meta;
```

### `@alexgorbatchev/story-title-convention`

**Policy:** Storybook files must set `meta.title` to the package-relative story path including the package name, with the structural `src/` and
`stories/` segments removed.

**Good**

```text
packages/ui/src/accounts/components/stories/AccountPanel.stories.tsx -> @scope/ui/accounts/components/AccountPanel
packages/ui/src/emails/templates/stories/receipt-email.stories.tsx -> @scope/ui/emails/templates/receipt-email
packages/ui/src/components/stories/forms/AccountPanel.stories.tsx -> @scope/ui/components/forms/AccountPanel
```

**Good**

```tsx
const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
  title: "@scope/ui/accounts/components/AccountPanel",
};
```

**Bad**

```tsx
const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
  title: "src/accounts/components/stories/AccountPanel",
};
```

### `@alexgorbatchev/story-export-contract`

**Policy:** After the default meta, exported runtime object bindings are treated as stories. Story exports must use
typed `Story` bindings, and every exported story must define a `play` property unless `meta.tags` or `story.tags`
remove the built-in Storybook `test` tag with `"!test"`. The export shape still depends on story count:

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

```tsx
const meta: Meta<typeof AccountPanel> = {
  component: AccountPanel,
  tags: ["!test"],
};

export default meta;

const Default: Story = {};

export { Default as AccountPanel };
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

To satisfy external interfaces that require a default export, you may add `export default useThing;` at the bottom of the file as a passthrough alias.

**Good**

```ts
export function useAccount() {
  return null;
}
```

```ts
export function useFeatureFlag() {
  return false;
}

export default useFeatureFlag;
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

**Policy:** Hook ownership files must use the configured basename form: `useThing.ts[x]` by default, or `use-thing.ts[x]` when `filenameStyle: FilenameStyle.DashCase` is configured. The exported hook name must still be `[use]PascalCase`, and it must match the filename's configured conversion exactly.

### `@alexgorbatchev/hook-export-location-convention`

**Policy:** Any exported runtime binding whose name starts with `use` must live in a direct-child ownership file under a
`hooks/` directory: `hooks/useThing.ts[x]` by default, or `hooks/use-thing.ts[x]` when `filenameStyle: FilenameStyle.DashCase`
is configured. This is a global leak guard so misplaced hooks are reported where they currently live.

### `@alexgorbatchev/hooks-directory-file-convention`

**Policy:** A `hooks/` directory may contain only direct-child hook ownership files in the configured form: `useThing.ts[x]` by default, or `use-thing.ts[x]` when `filenameStyle: FilenameStyle.DashCase` is configured, plus direct-child `index.ts` or `types.ts`, or a direct-child `__tests__/` tree.

### `@alexgorbatchev/hook-test-file-convention`

**Policy:** Every hook ownership file must have a test with the same basename and source extension somewhere under a
sibling `__tests__/` directory: `.ts` hooks require `basename.test.ts`, and `.tsx` hooks require `basename.test.tsx`.

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

**Companion semantic fix:** From this repository root, `just fix-semantic <target-directory>` can move misplaced
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

### `@alexgorbatchev/tests-directory-file-convention`

**Policy:** A `__tests__/` directory may contain only `*.test.ts`, `*.test.tsx`, `helpers.ts`, `helpers.tsx`,
`fixtures.ts`, `fixtures.tsx`, or files under `fixtures/`.

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
