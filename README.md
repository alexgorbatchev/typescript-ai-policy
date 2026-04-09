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
- a semantic-fix CLI for a small set of safe structural fixes

Upstream Oxlint, TypeScript, and Jest rules stay enabled as baseline correctness guardrails.

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

export default createOxlintConfig(() => ({
  ignorePatterns: ["coverage"],
  rules: {
    "no-var": "error",
  },
}));
```

Both config entrypoints export factory functions. The callback is optional and is deep-merged **before** the shared
defaults, so the shared policy still wins on conflicting keys.

For Oxlint specifically, consumer configs are extension-only. If the callback tries to redefine a shared rule, the
factory throws instead of letting repositories silently weaken the policy downstream.

The shared Oxlint config also force-disables `import/no-default-export` for `*.stories.tsx`, `oxlint.config.ts`, and
`oxfmt.config.ts`, because those file roles require default exports.

When you run Oxlint manually, use Bun to launch the CLI:

```bash
bun --bun oxlint .
```

Treat `bun --bun oxlint ...` as the canonical invocation form for this package and for consumer repositories using
these TypeScript config entrypoints.

## What it enforces

At a glance, the shared policy enforces:

- one runtime React component per ownership file
- one runtime hook per ownership file
- matching Storybook files for component ownership files under sibling `stories/` directories
- matching test files for hook ownership files under sibling `__tests__/` directories
- typed Storybook meta and typed stories with `play` functions
- deterministic component test ids such as `ComponentName` and `ComponentName--child`
- strict boundaries between runtime code, test code, story code, and fixture code
- explicit type/value ownership rules for files such as `index.ts`, `constants.ts`, and `types.ts`

## Expected layout shape

The policy enforces **role directories**, not one hardcoded feature tree.

That means component and hook ownership files may live in different parent folders, but some roles still have strict
placement rules:

- story files live under sibling `stories/` directories
- test files live under sibling `__tests__/` directories
- fixture entrypoints and fixture directories live under `stories/` or `__tests__/`
- component filenames match the exported PascalCase component name in PascalCase or kebab-case form
- hook filenames match the exported `use*` hook name in camelCase or kebab-case form
- `index.ts` is reserved for pure barrel re-exports only
- `constants.ts` is for runtime values only
- `types.ts` is for type-only exports only

Example:

```text
feature/
├── AccountPanel.tsx
├── stories/
│   └── AccountPanel.stories.tsx
├── useAccount.ts
└── __tests__/
    └── useAccount.test.ts
```

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

## Learn more

- [`src/oxlint/README.md`](./src/oxlint/README.md) — full rule catalog, rationale, and examples
- [`AGENTS.md`](./AGENTS.md) — repository guidance for coding agents working on this package

## Local package setup

This repository also consumes its own shared configs at the root:

- `oxfmt.config.ts`
- `oxlint.config.ts`
