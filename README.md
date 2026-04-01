# @alexgorbatchev/typescript-ai-policy

This package exists to codify TypeScript coding standards through lint rules as aggressively as practical.

The goal is to replace as much prose-based LLM guidance as possible with strict, machine-enforced checks. The custom
`@alexgorbatchev/*` rules turn repository conventions into deterministic policies, and their error messages are written
as direct repair instructions so an agent can make the required change instead of interpreting vague prose.

**The benefit is twofold: guaranteed enforcement and reduced number of context instructions.**

The shared Oxlint policy is implemented in TypeScript-authored custom rule modules under `src/oxlint/`.

Upstream rules stay enabled as baseline correctness guardrails around that stricter policy layer.

These rules are designed to work as a **full policy set**, not as a grab bag of independent preferences. Disabling one
rule can weaken contracts enforced by other rules, because many of the rules deliberately compose into a larger workflow
for React structure, test layout, fixture ownership, and import discipline. Treat rule removal as a policy change, not
as a local lint tweak.

The fixture rules in particular form a **coupled contract** across:

- location
- allowed contents
- export shape
- naming
- typing
- import path
- single entrypoint

If one of those fixture rules is disabled, the rest of the fixture contract becomes less reliable as agent guidance.

## Stated policy goals

The policy pack exists to enforce consistency in generated and modified code by making the expected repository shape
machine-checkable.

At a high level, the enforced goals are:

- one runtime React component per ownership file
- one runtime hook per ownership file
- every component ownership file must have a colocated Storybook file that acts as the required interaction-test
  surface
- every exported story must be typed and include a `play` function
- every hook ownership file must have a colocated test file
- non-story React components must expose deterministic test ids: the root id equals the component name, and child ids use `ComponentName--thing`
- component, hook, test, fixture, barrel, constants, and types file locations are enforced instead of left to taste
- test-only code and fixture-only code must stay isolated from runtime modules

## Canonical folder and filename contract

The custom rules do not just lint isolated files. Together they enforce a repository layout that keeps ownership,
colocation, and file roles deterministic for agent-written code:

```text
feature/
├── components/ | templates/ | layouts/
│   ├── ComponentName.tsx      # or component-name.tsx
│   ├── constants.ts
│   ├── index.ts
│   ├── types.ts
│   └── stories/
│       ├── ComponentName.stories.tsx
│       ├── helpers.ts         # or helpers.tsx
│       └── fixtures.ts        # or fixtures.tsx or fixtures/
├── hooks/
│   ├── useThing.ts            # or use-thing.ts / useThing.tsx / use-thing.tsx
│   ├── index.ts
│   ├── types.ts
│   └── __tests__/
│       ├── useThing.test.ts   # basename and ts/tsx extension must match the source file
│       ├── helpers.ts         # or helpers.tsx
│       └── fixtures.ts        # or fixtures.tsx or fixtures/
├── constants.ts               # runtime values only
├── types.ts                   # type-only exports only
└── index.ts                   # pure barrel only, never index.tsx
```

More precisely, the enforced structure is:

- Every non-hook, non-test `.tsx` file must live under `components/`, `templates/`, or `layouts/`.
- `components/`, `templates/`, and `layouts/` are **strict ownership directories**. Each of them may contain only:
  - direct-child component ownership files (`ComponentName.tsx` or `component-name.tsx`)
  - direct-child `constants.ts`
  - direct-child `index.ts`
  - direct-child `types.ts`
  - a direct-child `stories/` directory containing only:
    - direct-child `*.stories.tsx` files
    - `helpers.ts` or `helpers.tsx`
    - at most one fixture entrypoint shape: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`
    - files under `fixtures/`
- `hooks/` is also a **strict ownership directory**. It may contain only:
  - direct-child hook ownership files (`useThing.ts[x]` or `use-thing.ts[x]`)
  - direct-child `index.ts`
  - direct-child `types.ts`
  - a direct-child `__tests__/` tree
- Shared runtime helpers must live **outside** those strict ownership directories. Direct-child `helpers.ts` is not
  allowed inside `components/`, `templates/`, `layouts/`, or `hooks/`. Component-story support helpers are allowed only
  under the sibling `stories/` directory. Direct-child `constants.ts` is allowed only in component ownership
  directories, not in `hooks/`.
- Component filenames must match the exported PascalCase component name in either PascalCase or kebab-case form:
  - `export function AccountPanel()` → `AccountPanel.tsx` or `account-panel.tsx`
- Hook filenames must match the exported hook name in either camelCase or kebab-case `use*` form:
  - `export function useAccountSettings()` → `useAccountSettings.ts` / `useAccountSettings.tsx` or
    `use-account-settings.ts` / `use-account-settings.tsx`
- Every component ownership file must have a sibling Storybook file under `stories/` with the same basename:
  - `components/AccountPanel.tsx` → `components/stories/AccountPanel.stories.tsx`
  - `components/account-panel.tsx` → `components/stories/account-panel.stories.tsx`
- Storybook files must live only as direct children of that sibling `stories/` directory, must match an existing
  sibling component basename, must default-export a typed `meta` binding, and must export typed stories whose objects
  include a `play` function.
- Component ownership areas must not keep a sibling `__tests__/` tree. Component helpers and fixtures belong under the
  sibling `stories/` directory, and component interaction coverage is required to live in Storybook story files.
- Every hook ownership file must have a sibling test file in `__tests__/` with the same basename and the same
  source-extension family:
  - `hooks/useAccount.ts` → `hooks/__tests__/useAccount.test.ts`
  - `hooks/use-account.tsx` → `hooks/__tests__/use-account.test.tsx`
- Real tests must live in sibling `__tests__/` directories and must use the `.test.ts` or `.test.tsx` suffix.
- A `__tests__/` directory may contain only:
  - `*.test.ts` and `*.test.tsx`
  - `helpers.ts` and `helpers.tsx`
  - at most one fixture entrypoint shape: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`
  - files under `fixtures/`
- `index.ts` is reserved for pure barrel re-exports only. `index.tsx` is invalid.
- `constants.ts` is reserved for runtime values only.
- `types.ts` is reserved for type-only exports only.

For the rule-by-rule rationale and examples behind this contract, see [`src/oxlint/README.md`](./src/oxlint/README.md).

## Install

```bash
bun add -d @alexgorbatchev/typescript-ai-policy oxfmt oxlint
```

## Use

`oxfmt.config.ts`

```ts
import createOxfmtConfig from "@alexgorbatchev/typescript-ai-policy/oxfmt-config";

export default createOxfmtConfig(() => ({
  ignorePatterns: ["vendor/**"],
}));
```

`oxlint.config.ts`

```ts
import createOxlintConfig from "@alexgorbatchev/typescript-ai-policy/oxlint-config";

export default createOxlintConfig(() => ({
  ignorePatterns: ["coverage"],
  rules: {
    "no-var": "error",
  },
}));
```

Both config entrypoints now export factory functions. The callback is optional, it must return a valid Oxfmt/Oxlint
config object, and that object is deep-merged **before** the shared defaults so the shared policy still wins on any
conflicting keys.

For Oxlint specifically, consumer configs are extension-only: if the callback tries to redefine any shared rule name,
the factory throws with guidance to change the shared package instead of overriding that rule downstream.

## Local package setup

This package also uses its own shared configs at the repository root:

- `oxfmt.config.ts`
- `oxlint.config.ts`

## Enabled Oxlint error rules

### Built-in guardrails

| Rule                         | Policy encoded                                                            |
| ---------------------------- | ------------------------------------------------------------------------- |
| `eqeqeq`                     | Require `===` and `!==` so agents do not rely on coercion-based equality. |
| `typescript/no-explicit-any` | Ban explicit `any` so type contracts stay checkable and reviewable.       |
| `jest/no-disabled-tests`     | Block skipped or disabled tests in committed `*.test.ts(x)` files.        |
| `jest/no-focused-tests`      | Block focused tests so CI and local runs exercise the full suite.         |

### Custom agentic workflow rules

For rule-by-rule rationale plus good/bad examples, see [`src/oxlint/README.md`](./src/oxlint/README.md).

| Rule                                                            | Policy encoded                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@alexgorbatchev/testid-naming-convention`                      | Non-story React test ids must be scoped to the owning component as `ComponentName` or `ComponentName--thing`.                                                                                                                                |
| `@alexgorbatchev/no-react-create-element`                       | Regular application code must use JSX instead of `createElement`.                                                                                                                                                                            |
| `@alexgorbatchev/require-component-root-testid`                 | Non-story exported React components must render a DOM root with `data-testid`/`testId` exactly equal to the component name, and child ids must use `ComponentName--thing`.                                                                   |
| `@alexgorbatchev/component-file-location-convention`            | Every non-hook, non-test `.tsx` file must live under `components/`, `templates/`, or `layouts/`.                                                                                                                                             |
| `@alexgorbatchev/component-directory-file-convention`           | Component-area directories may contain only direct-child ownership files, `constants.ts`, `index.ts`, `types.ts`, and a sibling `stories/` tree.                                                                                             |
| `@alexgorbatchev/component-file-contract`                       | Component ownership files may export exactly one main runtime component plus unrestricted type-only API.                                                                                                                                     |
| `@alexgorbatchev/component-file-naming-convention`              | Component filenames must match their exported PascalCase component name in either PascalCase or kebab-case form.                                                                                                                             |
| `@alexgorbatchev/component-story-file-convention`               | Every component ownership file must have a sibling `stories/basename.stories.tsx` file and must not keep legacy component support files under `__tests__/`.                                                                                  |
| `@alexgorbatchev/stories-directory-file-convention`             | `stories/` directories may contain only direct-child `*.stories.tsx` files, `helpers.ts[x]`, fixture entrypoints, or files under `fixtures/`.                                                                                                |
| `@alexgorbatchev/story-file-location-convention`                | Storybook files must live as direct children of sibling `stories/` directories and must match a sibling component basename.                                                                                                                  |
| `@alexgorbatchev/story-meta-type-annotation`                    | The default Storybook meta must use a typed `const meta: Meta<typeof ComponentName>` binding instead of object assertions.                                                                                                                   |
| `@alexgorbatchev/story-export-contract`                         | Story exports must use typed `Story` bindings, every story must define `play`, and single-story vs multi-story export shapes are enforced.                                                                                                   |
| `@alexgorbatchev/hook-export-location-convention`               | Exported runtime `use*` bindings must live in direct-child `hooks/use*.ts[x]` ownership files; only `index.ts` and `types.ts` are exempt.                                                                                                    |
| `@alexgorbatchev/hooks-directory-file-convention`               | `hooks/` directories may contain only direct-child hook ownership files, `index.ts` / `types.ts`, and a sibling `__tests__/` tree.                                                                                                           |
| `@alexgorbatchev/hook-file-contract`                            | Hook ownership files may export exactly one main runtime hook and it must use `export function useThing() {}` form.                                                                                                                          |
| `@alexgorbatchev/hook-file-naming-convention`                   | Hook filenames must match their exported hook name as either `useFoo.ts[x]` or `use-foo.ts[x]`.                                                                                                                                              |
| `@alexgorbatchev/hook-test-file-convention`                     | Every hook ownership file must have a sibling `__tests__/basename.test.ts[x]` file whose basename and extension match the source file contract.                                                                                              |
| `@alexgorbatchev/no-non-running-tests`                          | Ban skip/todo/gated test modifiers that still leave non-running test code after the Jest rules run.                                                                                                                                          |
| `@alexgorbatchev/no-module-mocking`                             | Ban whole-module mocking APIs and push tests toward dependency injection plus explicit stubs.                                                                                                                                                |
| `@alexgorbatchev/no-test-file-exports`                          | Treat `*.test.ts(x)` files as execution units, not shared modules.                                                                                                                                                                           |
| `@alexgorbatchev/no-imports-from-tests-directory`               | Files outside `__tests__/` must not import, require, or re-export modules from any `__tests__/` directory.                                                                                                                                   |
| `@alexgorbatchev/interface-naming-convention`                   | Repository-owned interfaces must use `I` followed by PascalCase; ambient external contract interfaces such as `Window` stay exempt.                                                                                                          |
| `@alexgorbatchev/no-inline-type-expressions`                    | Explicit type usage must rely on named declarations or inference; do not define object, tuple, function, broad union, intersection, mapped, or conditional types inline at use sites. Narrow `T \| null \| undefined` wrappers stay allowed. |
| `@alexgorbatchev/index-file-contract`                           | `index.ts` must stay a pure barrel: no local definitions, no side effects, only re-exports, and never `index.tsx`.                                                                                                                           |
| `@alexgorbatchev/no-type-imports-from-constants`                | Types must not be imported from `constants` modules, including inline `import("./constants")` type queries.                                                                                                                                  |
| `@alexgorbatchev/no-type-exports-from-constants`                | `constants.ts` files may export runtime values only; exported types must move to `types.ts`.                                                                                                                                                 |
| `@alexgorbatchev/no-value-exports-from-types`                   | `types.ts` files may export type-only API only; runtime values and value re-exports must move elsewhere.                                                                                                                                     |
| `@alexgorbatchev/test-file-location-convention`                 | Real tests must live in sibling `__tests__/` directories and use the `.test.ts` / `.test.tsx` suffix.                                                                                                                                        |
| `@alexgorbatchev/tests-directory-file-convention`               | `__tests__/` may contain only test files, helpers, fixture entrypoints, or files under `fixtures/`.                                                                                                                                          |
| `@alexgorbatchev/fixture-file-contract`                         | `__tests__/fixtures.ts(x)` and `stories/fixtures.ts(x)` may export only direct named `const` fixtures and named factory functions.                                                                                                           |
| `@alexgorbatchev/fixture-export-naming-convention`              | Fixture entrypoint exports must use `fixture_<lowerCamelCase>` and `factory_<lowerCamelCase>`.                                                                                                                                               |
| `@alexgorbatchev/fixture-export-type-contract`                  | Fixture entrypoint exports must declare explicit imported concrete types and must not use `any` or `unknown`.                                                                                                                                |
| `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint` | `fixture_*` and `factory_*` exports may exist only in dedicated `__tests__/fixtures.ts(x)` or `stories/fixtures.ts(x)` entrypoints.                                                                                                          |
| `@alexgorbatchev/no-inline-fixture-bindings-in-tests`           | Test and story files must import `fixture_*` and `factory_*` bindings from `./fixtures` instead of declaring them inline.                                                                                                                    |
| `@alexgorbatchev/fixture-import-path-convention`                | Fixture-like imports inside test and story files must be named imports from the colocated `./fixtures` module with no aliasing.                                                                                                              |
| `@alexgorbatchev/no-local-type-declarations-in-fixture-files`   | Fixture files and `fixtures/` contents under `__tests__/` or `stories/` must import shared types instead of declaring local types, interfaces, or enums.                                                                                     |
| `@alexgorbatchev/single-fixture-entrypoint`                     | Each `__tests__/` or `stories/` directory must choose exactly one fixture entrypoint shape: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`.                                                                                                   |
