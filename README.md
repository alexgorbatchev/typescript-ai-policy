# @alexgorbatchev/typescript-ai-policy

Shared **Oxfmt** and **Oxlint** config for teams that want AI-assisted TypeScript to stay strict, predictable, and
reviewable.

This package is opinionated on purpose. It does not try to be a flexible style preset. It encodes repository contracts
as lint rules so generated and modified code lands in a shape you can actually trust.

## Who this is for

Use this package if you want to:

- enforce stricter structure on AI-generated or AI-modified TypeScript
- replace hand-wavy coding guidance with machine-checkable rules
- keep React, tests, fixtures, and type boundaries deterministic
- ship one shared policy pack across repositories

If you want a loose collection of optional style rules, this package is the wrong tool.

## What you get

- shared Oxfmt config
- shared Oxlint config
- custom `@alexgorbatchev/*` rules aimed at common LLM failure modes
- diagnostics written as direct repair instructions
- the `typescript-ai-policy` CLI with `fix-semantic` and `guidance` commands

Upstream Oxlint, TypeScript, and Jest rules stay enabled as baseline correctness guardrails.

## Install

```bash
bun add -d @alexgorbatchev/typescript-ai-policy oxfmt oxlint
```

If you want to use the `typescript-ai-policy fix-semantic` command, install its optional peer dependencies too:

```bash
bun add -d typescript @typescript/native-preview
```

The published package ships compiled `.js` runtime files plus `.d.ts` declarations. The installed `typescript-ai-policy`
CLI runs through Bun, so Bun is required to execute the package-installed bin. The `fix-semantic` command still
expects its optional peer dependencies to be installed in the consuming project, while `guidance` only reads the
published policy metadata.

## Quick start

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

export default createOxlintConfig({
  ignorePatterns: ["coverage"],
  rules: {
    "no-var": "error",
  },
});
```

Both config entrypoints export factory functions. `createOxlintConfig(...)` accepts either a config object or a
callback that returns one. The returned user config is deep-merged **before** the shared defaults, so the shared
policy still wins on conflicting keys.

For Oxlint specifically, consumer configs are extension-only. If the provided config tries to redefine a shared rule,
the factory throws instead of letting repositories silently weaken the policy downstream.

`createOxlintConfig` also exports `FilenameStyle` as a named export from
`@alexgorbatchev/typescript-ai-policy/oxlint-config`. `createOxlintConfig` reserves the `filenameStyle` key for this
package's shared filename policy. It defaults to `FilenameStyle.PascalCase`, which enforces `ComponentName.tsx` and
`useThing.ts{,x}` ownership files. Set `filenameStyle: FilenameStyle.DashCase` to enforce `component-name.tsx` and
`use-thing.ts{,x}` instead:

```ts
import createOxlintConfig, { FilenameStyle } from "@alexgorbatchev/typescript-ai-policy/oxlint-config";

export default createOxlintConfig({
  filenameStyle: FilenameStyle.DashCase,
  ignorePatterns: ["coverage"],
});
```

When you run Oxlint manually, use Bun to launch the CLI:

```bash
bun --bun oxlint .
```

Treat `bun --bun oxlint ...` as the canonical invocation form for this package and for consumer repositories using
these TypeScript config entrypoints.

## What it enforces

At a glance, the shared policy enforces:

- baseline guardrails such as strict equality and no `any`
- component ownership files that export exactly one main component or one multipart component family, plus type-only secondary API, and live under canonical `components/`, `templates/`, or `layouts/` directories using `ComponentName.tsx` by default or `component-name.tsx` when `filenameStyle: FilenameStyle.DashCase` is configured
- hook ownership files that export exactly one main `use*` hook, plus type-only secondary API, and live as direct-child `hooks/useThing.ts[x]` files by default or `hooks/use-thing.ts[x]` when `filenameStyle: FilenameStyle.DashCase` is configured
- JSX-only React component code instead of `React.createElement(...)`
- matching Storybook files for component ownership files under sibling `stories/` directories, with story support files limited to `helpers.ts[x]`, `fixtures.ts[x]`, or `fixtures/`
- Storybook project support `.tsx` files under direct or nested `.storybook/` paths without treating them as component ownership files
- matching test files for hook ownership files under sibling `__tests__/` directories, with test support files limited to `helpers.ts[x]`, `fixtures.ts[x]`, or `fixtures/`
- typed Storybook meta with package-relative titles, typed story exports, and required `play` functions
- deterministic component test ids such as `ComponentName` and `ComponentName--child`, plus required root test ids for exported ownership components
- canonical component ownership directories (`components/`, `templates/`, `layouts/`) as the only product `.tsx` surface allowed to render raw intrinsic JSX or pass direct `className` / `style` props, with file-role carve-outs for story/test support and Storybook `.storybook/` support files
- strict boundaries between runtime code, test code, story code, and fixture code, including no imports from `__tests__/` into runtime code and no type imports from `constants.ts`
- test-file discipline: no skipped or focused tests, no conditional logic, no `throw`, no module mocking, no test-file exports, and no inline fixture bindings
- fixture discipline: canonical location, single entrypoint, constrained export naming and export types, no local type declarations, and canonical fixture import paths
- explicit type/value ownership rules for files such as `index.ts`, `constants.ts`, and `types.ts`
- strict type and function-contract rules: `I*` interfaces only, no `I*` type aliases, no direct interface-to-type passthrough aliases, no trivial property-selector forwarding wrappers whose names merely restate the selected property, no inline type imports or inline structural type expressions, and indented multiline template literals
- a policy stance that inline lint-disable comments are not an acceptable escape hatch for fixing violations

## Lint-disable comments are not a valid repair strategy

Agents and developers are expected to satisfy the shared policy directly, not suppress it locally with comments such as `// oxlint-disable-next-line` or `/* oxlint-disable */`.

This package explicitly bans inline lint-disable comments for both ESLint and Oxlint. Treat this as a **hard policy signal**, not as an obstacle to bypass. The enforcement strategy assumes you will fix the underlying contract violation rather than suppressing the warning.

The important contract is simple:

- do not use inline lint-disable comments to get around the shared policy
- fix the code so it satisfies the rule set instead
- if the policy itself is wrong, change the shared package deliberately rather than bypassing it locally

## Storybook is the React component contract

For React components, this policy is intentionally **story-first**.

Every component ownership file must have a matching Storybook file, every story meta must be typed and use a
package-relative `title`, and every exported story must be typed and include a `play` function unless `!test` removes
the built-in Storybook `test` tag for that story. In practice, that makes Storybook the canonical artifact for
component behavior:

- the same story layer can back CI interaction coverage
- the same stories also act as the human visual reference for the component
- component structure and component verification stay in one place instead of drifting across separate ad-hoc test files

This package does **not** wire your CI for you, but it does enforce the repository shape required for Storybook-driven
component verification.

## Expected layout shape

The policy enforces canonical role directories inside your feature tree.

That means repositories can choose their feature boundaries, but component, story, hook, and test files still have
fixed ownership locations:

- component ownership `.tsx` files live under `components/`, `templates/`, or `layouts/`
- nested subdirectories inside those component ownership areas are allowed but not required
- non-story, non-test `.tsx` files must not render raw intrinsic JSX such as `<div>`, `<span>`, or `<p>` unless the
  file lives inside one of those canonical component ownership areas
- direct `className` and `style` props are only allowed on raw HTML elements in files inside those canonical component ownership areas. Custom/capitalized components must not accept `className` or `style` props in any file.
- Storybook project support `.tsx` files under `.storybook/*.tsx` and `.storybook/**/*.tsx` are not component ownership
  files and may use local Storybook wrapper markup
- story files live under sibling `stories/` directories, and that area is reserved for `*.stories.tsx`, `helpers.ts[x]`, `fixtures.ts[x]`, and `fixtures/`
- exported runtime hooks whose names start with `use` live under direct-child `hooks/` ownership files
- test files live under sibling `__tests__/` directories, and that area is reserved for `*.test.ts[x]`, `helpers.ts[x]`, `fixtures.ts[x]`, and `fixtures/`
- fixture entrypoints and fixture directories live under `stories/` or `__tests__/`
- component filenames match the exported PascalCase component name in `ComponentName.tsx` form by default, or `component-name.tsx` when `filenameStyle: FilenameStyle.DashCase` is configured
- hook filenames match the exported `use*` hook name in `useThing.ts[x]` form by default, or `use-thing.ts[x]` when `filenameStyle: FilenameStyle.DashCase` is configured
- `index.ts` is reserved for pure barrel re-exports only
- `constants.ts` is for runtime values only
- `types.ts` is for type-only exports only

Example:

```text
feature/
├── components/
│   ├── AccountPanel.tsx
│   └── stories/
│       └── AccountPanel.stories.tsx
└── hooks/
    ├── useAccount.ts
    └── __tests__/
        └── useAccount.test.ts
```

Minimal config:

```ts
import createOxlintConfig from "@alexgorbatchev/typescript-ai-policy/oxlint-config";

export default createOxlintConfig();
```

With that config in place, routes, pages, feature views, and other product `.tsx` files must render imported components
instead of raw DOM tags, and they must not pass direct `className` or `style` props. Raw intrinsic JSX and direct
styling props stay on raw HTML elements inside canonical component ownership areas, story/test support files, or Storybook `.storybook/`
support files. Passing `className` or `style` props to custom components is banned everywhere.

In a consuming repository, use `typescript-ai-policy check` through your package manager's local binary runner to
execute the shared formatter and linter checks against that repo.

When a consuming harness supports environment injection, configure that harness to run shell commands with `AGENT=1`
so `typescript-ai-policy check` emits agent-formatted `oxlint` output automatically for agent workflows and more
token-efficient lint output.

## CLI tooling

The package includes the `typescript-ai-policy` CLI. Its `fix-semantic` command is backed by `tsc --lsp --stdio`, and
its `guidance` command prints authoritative repair guidance for the local `@alexgorbatchev/*` rules as a wrapped
Markdown bullet list with bold rule names or as JSON.

Package-installed usage:

- `bun run typescript-ai-policy -- check` — run the package formatter and linter checks in the consuming repository. When the consuming harness is configured to inject `AGENT=1`, the `oxlint` step uses agent formatting automatically for agent workflows and more token-efficient output.
- `bun run typescript-ai-policy -- guidance` — print the published rule guidance that the package exposes for AI agents as a wrapped Markdown bullet list with bold rule names.
- `bun run typescript-ai-policy -- guidance --json` — print the same published rule guidance as JSON objects with `ruleName` and resolved `guidance` fields.
- `bun run typescript-ai-policy -- fix-semantic <target-directory>` — run Oxlint with this package's policy config, collect supported diagnostics, and apply semantic fixes to the target directory.
- `bun run typescript-ai-policy -- fix-semantic <target-directory> --dry-run` — print the planned semantic-fix scope without mutating files.

The published `guidance` output is package-level repair guidance, not a repository-specific config dump. Agents should
still inspect the consuming repository's actual `oxlint.config.ts` before applying file-specific guidance in another
codebase.

Repository-local development usage:

- `bun run cli -- guidance` — run the repository-local CLI entrypoint directly from TypeScript source.
- `bun run cli -- guidance --json` — print the same repository-local guidance output as JSON.
- `bun run cli -- fix-semantic <target-directory>` — run the repository-local CLI entrypoint for semantic fixes.
- `bun run fix:semantic -- <target-directory>` — run the same `fix-semantic` command from this repository checkout while developing the package itself.

The repository-local development command uses Bun to execute the TypeScript source directly. The published npm package
also uses a compiled Bun-targeted bin.

Today the framework applies three conservative semantic fixes:

- `@alexgorbatchev/interface-naming-convention` — rename repository-owned interfaces to their required `I*` form when the existing name can be normalized safely.
- `@alexgorbatchev/no-i-prefixed-type-aliases` — rename repository-owned type aliases to drop the interface-style `I*` prefix when the diagnostic resolves to a concrete type alias name safely.
- `@alexgorbatchev/test-file-location-convention` — move misplaced `.test.ts` / `.test.tsx` files into a sibling `__tests__/` directory as `__tests__/basename.test.ts[x]` and rewrite the moved file's relative imports.

The command and backend shape remain intentionally generic so more rule-backed semantic operations can be added later.

## Learn more

- [`src/oxlint/README.md`](./src/oxlint/README.md) — full rule catalog, rationale, and examples
- [`AGENTS.md`](./AGENTS.md) — repository guidance for coding agents working on this package

## Local package setup

This repository also consumes its own shared configs at the root:

- `oxfmt.config.ts`
- `oxlint.config.ts`
