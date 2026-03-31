# @alexgorbatchev/typescript-common

Shared Oxfmt and Oxlint configs for reuse across projects.

## Install

```bash
bun add -d @alexgorbatchev/typescript-common oxfmt oxlint
```

## Use

`oxfmt.config.ts`

```ts
export { default } from "@alexgorbatchev/typescript-common/oxfmt-config";
```

`oxlint.config.ts`

```ts
export { default } from "@alexgorbatchev/typescript-common/oxlint-config";
```

## Local package setup

This package also uses its own shared configs at the repository root:

- `oxfmt.config.ts`
- `oxlint.config.ts`

Available script:

```bash
bun run check
```

`check` runs:

- `oxfmt --check .`
- `oxlint .`
- `tsgo --noEmit`
- `bun test`

## Exports

- `@alexgorbatchev/typescript-common/oxfmt-config`
- `@alexgorbatchev/typescript-common/oxlint-config`
- `@alexgorbatchev/typescript-common/oxlint-plugin`

The shared Oxlint config includes the custom interface-naming, explicit-type, index-barrel, type/value-boundary, React, test, and fixture-policy plugin rules automatically.

## Oxlint policy philosophy

This package treats linting as a **policy surface for agentic workflows**, not just as style enforcement.

The custom `@alexgorbatchev/*` rules encode repository conventions as deterministic, machine-followable policies, and
their error messages are intentionally written as **LLM steering instructions** that tell an agent exactly what to do
next. Upstream Oxlint/Jest/TypeScript rules stay enabled as generic correctness guardrails around that custom policy
layer.

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

## Enabled Oxlint error rules

### Built-in guardrails

| Rule                         | Policy encoded                                                            |
| ---------------------------- | ------------------------------------------------------------------------- |
| `eqeqeq`                     | Require `===` and `!==` so agents do not rely on coercion-based equality. |
| `typescript/no-explicit-any` | Ban explicit `any` so type contracts stay checkable and reviewable.       |
| `jest/no-disabled-tests`     | Block skipped or disabled tests in committed `*.test.ts(x)` files.        |
| `jest/no-focused-tests`      | Block focused tests so CI and local runs exercise the full suite.         |

### Custom agentic workflow rules

| Rule                                                            | Policy encoded                                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@alexgorbatchev/testid-naming-convention`                      | Every React test id must be scoped to the owning component as `ComponentName` or `ComponentName--thing`.                                                                        |
| `@alexgorbatchev/no-react-create-element`                       | Regular application code must use JSX instead of `createElement`.                                                                                                               |
| `@alexgorbatchev/require-component-root-testid`                 | Exported React components must render a DOM root with `data-testid`/`testId` exactly equal to the component name, and child ids must use `ComponentName--thing`.                |
| `@alexgorbatchev/component-file-location-convention`            | Every non-hook, non-test `.tsx` file must live under `components/`, `templates/`, or `layouts/`.                                                                                |
| `@alexgorbatchev/component-directory-file-convention`           | Component-area directories may contain only direct-child ownership files, `index.ts` / `types.ts`, and a sibling `__tests__/` tree.                                             |
| `@alexgorbatchev/component-file-contract`                       | Component ownership files may export exactly one main runtime component plus unrestricted type-only API.                                                                        |
| `@alexgorbatchev/component-file-naming-convention`              | Component filenames must match their exported PascalCase component name in either PascalCase or kebab-case form.                                                                |
| `@alexgorbatchev/component-test-file-convention`                | Every component ownership file must have a sibling `__tests__/basename.test.tsx` file with a matching basename.                                                                 |
| `@alexgorbatchev/hook-export-location-convention`               | Exported runtime `use*` bindings must live in direct-child `hooks/use*.ts[x]` ownership files; only `index.ts` and `types.ts` are exempt.                                       |
| `@alexgorbatchev/hooks-directory-file-convention`               | `hooks/` directories may contain only direct-child hook ownership files, `index.ts` / `types.ts`, and a sibling `__tests__/` tree.                                              |
| `@alexgorbatchev/hook-file-contract`                            | Hook ownership files may export exactly one main runtime hook and it must use `export function useThing() {}` form.                                                             |
| `@alexgorbatchev/hook-file-naming-convention`                   | Hook filenames must match their exported hook name as either `useFoo.ts[x]` or `use-foo.ts[x]`.                                                                                 |
| `@alexgorbatchev/hook-test-file-convention`                     | Every hook ownership file must have a sibling `__tests__/basename.test.ts[x]` file whose basename and extension match the source file contract.                                 |
| `@alexgorbatchev/no-non-running-tests`                          | Ban skip/todo/gated test modifiers that still leave non-running test code after the Jest rules run.                                                                             |
| `@alexgorbatchev/no-module-mocking`                             | Ban whole-module mocking APIs and push tests toward dependency injection plus explicit stubs.                                                                                   |
| `@alexgorbatchev/no-test-file-exports`                          | Treat `*.test.ts(x)` files as execution units, not shared modules.                                                                                                              |
| `@alexgorbatchev/no-imports-from-tests-directory`               | Files outside `__tests__/` must not import, require, or re-export modules from any `__tests__/` directory.                                                                      |
| `@alexgorbatchev/interface-naming-convention`                   | Repository-owned interfaces must use `I` followed by PascalCase; ambient external contract interfaces such as `Window` stay exempt.                                             |
| `@alexgorbatchev/no-inline-type-expressions`                    | Explicit type usage must rely on named declarations or inference; do not define object, tuple, function, broad union, intersection, mapped, or conditional types inline at use sites. Narrow `T \| null \| undefined` wrappers stay allowed. |
| `@alexgorbatchev/index-file-contract`                           | `index.ts` must stay a pure barrel: no local definitions, no side effects, only re-exports, and never `index.tsx`.                                                              |
| `@alexgorbatchev/no-type-imports-from-constants`                | Types must not be imported from `constants` modules, including inline `import("./constants")` type queries.                                                                     |
| `@alexgorbatchev/no-type-exports-from-constants`                | `constants.ts` files may export runtime values only; exported types must move to `types.ts`.                                                                                    |
| `@alexgorbatchev/no-value-exports-from-types`                   | `types.ts` files may export type-only API only; runtime values and value re-exports must move elsewhere.                                                                        |
| `@alexgorbatchev/test-file-location-convention`                 | Real tests must live in sibling `__tests__/` directories and use the `.test.ts` / `.test.tsx` suffix.                                                                           |
| `@alexgorbatchev/tests-directory-file-convention`               | `__tests__/` may contain only test files, helpers, fixture entrypoints, or files under `fixtures/`.                                                                             |
| `@alexgorbatchev/fixture-file-contract`                         | `__tests__/fixtures.ts(x)` may export only direct named `const` fixtures and named factory functions.                                                                           |
| `@alexgorbatchev/fixture-export-naming-convention`              | Fixture entrypoint exports must use `fixture_<lowerCamelCase>` and `factory_<lowerCamelCase>`.                                                                                  |
| `@alexgorbatchev/fixture-export-type-contract`                  | Fixture entrypoint exports must declare explicit imported concrete types and must not use `any` or `unknown`.                                                                   |
| `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint` | `fixture_*` and `factory_*` exports may exist only in the dedicated `__tests__/fixtures.ts(x)` entrypoint.                                                                      |
| `@alexgorbatchev/no-inline-fixture-bindings-in-tests`           | Tests must import `fixture_*` and `factory_*` bindings from `./fixtures` instead of declaring them inline.                                                                      |
| `@alexgorbatchev/fixture-import-path-convention`                | Fixture-like imports inside tests must be named imports from the colocated `./fixtures` module with no aliasing.                                                                |
| `@alexgorbatchev/no-local-type-declarations-in-fixture-files`   | Fixture files and `fixtures/` contents must import shared types instead of declaring local types, interfaces, or enums.                                                         |
| `@alexgorbatchev/single-fixture-entrypoint`                     | Each `__tests__/` directory must choose exactly one fixture entrypoint shape: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`.                                                    |

Rules explicitly disabled in the shared config: `no-console`, `jsx-a11y/no-autofocus`.

For rule-by-rule rationale plus good/bad examples, see [`src/oxlint/README.md`](./src/oxlint/README.md).
