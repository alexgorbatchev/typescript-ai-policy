# @alexgorbatchev/typescript-ai-policy

This package exists to codify TypeScript coding standards through lint rules as aggressively as practical.

The goal is to replace as much prose-based LLM guidance as possible with strict, machine-enforced checks. The custom
`@alexgorbatchev/*` rules turn repository conventions into deterministic policies, and their error messages are written
as direct repair instructions so an agent can make the required change instead of interpreting vague prose.

**The benefit is twofold: guaranteed enforcement and reduced number of context instructions.**

The shared Oxlint policy is implemented in TypeScript-authored custom rule modules under `src/oxlint/`.

File-level diagnostics are anchored to the first top-level syntax node when possible so editors highlight a concrete
repair location instead of painting the entire file.

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
- every component ownership file must have a matching Storybook file under a sibling `stories/` directory
- every exported story must be typed and include a `play` function
- every hook ownership file must have a matching test file under a sibling `__tests__/` directory
- non-story React components must expose deterministic test ids: the root id equals the component name, and child ids use `ComponentName--thing`
- tests and test fixtures must stay under `__tests__/`, story files must stay under `stories/`, and fixture exports must stay inside those role directories
- test-only code and fixture-only code must stay isolated from runtime modules

## Folder and filename contract

The shared policy now enforces **role directories**, not a single canonical feature tree.

That means component and hook ownership files may live in whatever parent folders a consumer repository chooses, but
some file roles still have hard placement requirements:

- Story files must live somewhere under a sibling `stories/` directory.
- Test files must live somewhere under a sibling `__tests__/` directory.
- Fixture entrypoints and fixture directories must live under `stories/` or `__tests__/`.
- Component filenames must still match their exported PascalCase component name in either PascalCase or kebab-case
  form:
  - `export function AccountPanel()` → `AccountPanel.tsx` or `account-panel.tsx`
- Hook filenames must still match their exported hook name in either camelCase or kebab-case `use*` form:
  - `export function useAccountSettings()` → `useAccountSettings.ts` / `useAccountSettings.tsx` or
    `use-account-settings.ts` / `use-account-settings.tsx`
- Every component ownership file must still have a matching `basename.stories.tsx` file under a sibling `stories/`
  tree.
- Every hook ownership file must still have a matching `basename.test.ts[x]` file under a sibling `__tests__/` tree.
- Story files must still map back to a sibling component basename, default-export a typed `meta` binding, and export
  typed stories whose objects include a `play` function.
- `index.ts` is reserved for pure barrel re-exports only. `index.tsx` is invalid.
- `constants.ts` is reserved for runtime values only.
- `types.ts` is reserved for type-only exports only.

A valid consumer layout can therefore look like any of these:

```text
feature/
├── AccountPanel.tsx
├── stories/
│   ├── AccountPanel.stories.tsx
│   └── catalog/
│       └── AccountPanelAlt.stories.tsx
├── useAccount.ts
└── __tests__/
    ├── useAccount.test.ts
    └── integration/
        └── AccountPanel.test.tsx
```

```text
feature/
├── ui/
│   ├── account-panel.tsx
│   └── stories/
│       └── catalog/
│           └── account-panel.stories.tsx
└── data/
    ├── use-account.ts
    └── __tests__/
        └── hooks/
            └── use-account.test.ts
```

For the rule-by-rule rationale and examples behind this contract, see [`src/oxlint/README.md`](./src/oxlint/README.md).

## Install

```bash
bun add -d @alexgorbatchev/typescript-ai-policy oxfmt oxlint
```

If you want the semantic-fix CLI, install its tsgo backend too:

```bash
bun add -d @typescript/native-preview
```

The semantic-fix CLI requires Bun at runtime because the installed bin uses a Bun shebang. That means Bun must be
installed and available on `PATH` when you run the command.

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

When you run Oxlint manually, use Bun to launch the CLI:

```bash
bun --bun oxlint .
```

Treat `bun --bun oxlint ...` as the canonical invocation form for this package and for consumer repositories using
these TypeScript config entrypoints.

## Local package setup

This package also uses its own shared configs at the repository root:

- `oxfmt.config.ts`
- `oxlint.config.ts`

## Semantic-fix tooling

The package includes a semantic-fix CLI backed by `tsgo --lsp --stdio`.

Package-installed usage:

- `bun run typescript-ai-policy-fix-semantic -- <target-directory>` — run Oxlint with this package's policy config, collect supported diagnostics, and apply semantic fixes to the target directory.
- `bun run typescript-ai-policy-fix-semantic -- <target-directory> --dry-run` — print the planned semantic-fix scope without mutating files.

Repository-local development usage:

- `bun run fix:semantic -- <target-directory>` — run the same semantic fixer from this repository checkout while developing the package itself.

Today the framework applies three conservative semantic fixes:

- `@alexgorbatchev/interface-naming-convention` — rename repository-owned interfaces to their required `I*` form when the existing name can be normalized safely.
- `@alexgorbatchev/no-i-prefixed-type-aliases` — rename repository-owned type aliases to drop the interface-style `I*` prefix when the diagnostic resolves to a concrete type alias name safely.
- `@alexgorbatchev/test-file-location-convention` — move misplaced `.test.ts` / `.test.tsx` files into a sibling `__tests__/` directory as `__tests__/basename.test.ts[x]` and rewrite the moved file's relative imports.

The command and backend shape remain intentionally generic so more rule-backed semantic operations can be added later.

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

| Rule                                                            | Policy encoded                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@alexgorbatchev/testid-naming-convention`                      | Non-story React test ids must be scoped to the owning component as `ComponentName` or `ComponentName--thing`.                                                                                                                                                               |
| `@alexgorbatchev/no-react-create-element`                       | Regular application code must use JSX instead of `createElement`.                                                                                                                                                                                                           |
| `@alexgorbatchev/require-component-root-testid`                 | Non-story exported React components must render a DOM root with `data-testid`/`testId` exactly equal to the component name, and child ids must use `ComponentName--thing`.                                                                                                  |
| `@alexgorbatchev/component-file-contract`                       | Component ownership files may export exactly one main runtime component plus unrestricted type-only API.                                                                                                                                                                    |
| `@alexgorbatchev/component-file-naming-convention`              | Component filenames must match their exported PascalCase component name in either PascalCase or kebab-case form; non-component `.tsx` modules should be renamed to `.ts`.                                                                                                   |
| `@alexgorbatchev/component-story-file-convention`               | Every component ownership file must have a matching `basename.stories.tsx` file somewhere under a sibling `stories/` directory.                                                                                                                                             |
| `@alexgorbatchev/story-file-location-convention`                | Storybook files must live under sibling `stories/` directories and must still match a sibling component basename.                                                                                                                                                           |
| `@alexgorbatchev/story-meta-type-annotation`                    | The default Storybook meta must use a typed `const meta: Meta<typeof ComponentName>` binding instead of object assertions.                                                                                                                                                  |
| `@alexgorbatchev/story-export-contract`                         | Story exports must use typed `Story` bindings, every story must define `play`, and single-story vs multi-story export shapes are enforced.                                                                                                                                  |
| `@alexgorbatchev/hook-file-contract`                            | Hook ownership files may export exactly one main runtime hook and it must use `export function useThing() {}` form.                                                                                                                                                         |
| `@alexgorbatchev/hook-file-naming-convention`                   | Hook filenames must match their exported hook name as either `useFoo.ts[x]` or `use-foo.ts[x]`.                                                                                                                                                                             |
| `@alexgorbatchev/hook-test-file-convention`                     | Every hook ownership file must have a matching `__tests__/basename.test.ts[x]` file somewhere under a sibling `__tests__/` directory, with the same source extension family.                                                                                                |
| `@alexgorbatchev/no-non-running-tests`                          | Ban skip/todo/gated test modifiers that still leave non-running test code after the Jest rules run.                                                                                                                                                                         |
| `@alexgorbatchev/no-conditional-logic-in-tests`                 | Ban `if`, `switch`, and ternary control flow in committed `*.test.ts(x)` files so assertions execute deterministically and test paths stay explicit.                                                                                                                        |
| `@alexgorbatchev/no-throw-in-tests`                             | Ban `throw new Error(...)` in committed `*.test.ts(x)` files so failures use explicit `assert(...)` / `assert.fail(...)` calls instead of ad-hoc exception paths.                                                                                                           |
| `@alexgorbatchev/no-module-mocking`                             | Ban whole-module mocking APIs and push tests toward dependency injection plus explicit stubs.                                                                                                                                                                               |
| `@alexgorbatchev/no-test-file-exports`                          | Treat `*.test.ts(x)` files as execution units, not shared modules.                                                                                                                                                                                                          |
| `@alexgorbatchev/no-imports-from-tests-directory`               | Files outside `__tests__/` must not import, require, or re-export modules from any `__tests__/` directory.                                                                                                                                                                  |
| `@alexgorbatchev/interface-naming-convention`                   | Repository-owned interfaces must use `I` followed by PascalCase; ambient external contract interfaces such as `Window` stay exempt.                                                                                                                                         |
| `@alexgorbatchev/no-i-prefixed-type-aliases`                    | Type aliases must not use the interface-style `I[A-Z]` prefix; this applies to `type` aliases only and does not change the separate interface naming contract.                                                                                                              |
| `@alexgorbatchev/no-inline-type-expressions`                    | Explicit type usage must rely on named declarations or inference; do not define object, tuple, function, broad union, intersection, mapped, or conditional types inline at use sites. Narrow `T \| null \| undefined` wrappers stay allowed.                                |
| `@alexgorbatchev/require-template-indent`                       | Multiline template literals that begin on their own line must keep their content indented with the surrounding code so embedded text stays reviewable and intentional; if indentation is significant, normalize the string explicitly with `@alexgorbatchev/dedent-string`. |
| `@alexgorbatchev/index-file-contract`                           | `index.ts` must stay a pure barrel: no local definitions, no side effects, only re-exports, and never `index.tsx`.                                                                                                                                                          |
| `@alexgorbatchev/no-type-imports-from-constants`                | Types must not be imported from `constants` modules, including inline `import("./constants")` type queries.                                                                                                                                                                 |
| `@alexgorbatchev/no-type-exports-from-constants`                | `constants.ts` files may export runtime values only; exported types must move to `types.ts`.                                                                                                                                                                                |
| `@alexgorbatchev/no-value-exports-from-types`                   | `types.ts` files may export type-only API only; runtime values and value re-exports must move elsewhere.                                                                                                                                                                    |
| `@alexgorbatchev/test-file-location-convention`                 | Repository-owned `.test.ts` / `.test.tsx` files must live under `__tests__/` directories. `.spec.ts[x]` files are ignored by this rule. The semantic fixer moves misplaced `.test.ts[x]` files into a sibling `__tests__/` directory and rewrites their relative imports.   |
| `@alexgorbatchev/fixture-file-contract`                         | `__tests__/fixtures.ts(x)` and `stories/fixtures.ts(x)` may export only direct named `const` fixtures and named factory functions.                                                                                                                                          |
| `@alexgorbatchev/fixture-export-naming-convention`              | Fixture entrypoint exports must use `fixture_<lowerCamelCase>` and `factory_<lowerCamelCase>`.                                                                                                                                                                              |
| `@alexgorbatchev/fixture-export-type-contract`                  | Fixture entrypoint exports must declare explicit imported concrete types and must not use `any` or `unknown`.                                                                                                                                                               |
| `@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint` | `fixture_*` and `factory_*` exports may exist only in nested `fixtures.ts(x)` entrypoints under `__tests__/` or `stories/`.                                                                                                                                                 |
| `@alexgorbatchev/no-inline-fixture-bindings-in-tests`           | Test and story files must import `fixture_*` and `factory_*` bindings from a relative `fixtures` module inside the same `__tests__/` or `stories/` tree instead of declaring them inline.                                                                                   |
| `@alexgorbatchev/fixture-import-path-convention`                | Fixture-like imports inside test and story files must be named imports from a relative `fixtures` module inside the same `__tests__/` or `stories/` tree, with no aliasing.                                                                                                 |
| `@alexgorbatchev/no-local-type-declarations-in-fixture-files`   | Fixture files and `fixtures/` contents under `__tests__/` or `stories/` must import shared types instead of declaring local types, interfaces, or enums.                                                                                                                    |
| `@alexgorbatchev/single-fixture-entrypoint`                     | Each fixture-support directory under `__tests__/` or `stories/` must choose exactly one fixture entrypoint shape: `fixtures.ts`, `fixtures.tsx`, or `fixtures/`.                                                                                                            |
