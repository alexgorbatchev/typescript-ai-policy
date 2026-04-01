# AGENTS

This directory contains the local **Oxlint plugin source** for this package.

## Folder intent

- `plugin.ts` is the TypeScript plugin entrypoint that registers the local rules under a plugin name
- `rules/` contains the individual Oxlint rule modules
- `rules/__tests__/` contains Bun + `RuleTester` tests for those rules
- when making changes, update `README.md` at root level and in `oxlint`

## Policy intent

All rules in this plugin are specifically aimed at **steering agentic coding toward repository best practices**.

Treat every lint rule in `rules/` as an **LLM steering instruction**, not as an arbitrary style preference.
When adding or changing rules:

- write rules to encode stable repository conventions that an LLM agent can follow reliably
- prefer explicit, deterministic guidance over subjective style opinions
- make rule names, `meta.docs.description`, messages, and tests read like concrete agent instructions about what must be done or avoided
- reject vague or aesthetic-only rules that do not improve agent behavior, correctness, maintainability, or contract adherence

If a policy cannot be expressed clearly as a steering instruction for an LLM coding agent, it does not belong in this plugin.

## Plugin-format contract

**Keep the plugin entrypoint in TypeScript `.ts` ESM format.**

This repository now stores the plugin source in `plugin.ts`, using the same ESLint 10+ compatible plugin shape:

```ts
const plugin = {
  meta: { name: "..." },
  rules: { "...": ruleModule },
};

export default plugin;
```

## Rule activation scope contract

When wiring a rule into `oxlint.config.ts`, classify its scope before you enable it:

- use global `rules` only for true ingress/leak rules that must inspect arbitrary files outside the rule's canonical area
- if a rule's target set is identifiable from path globs alone, enable it in the narrowest `overrides[].files` entry instead of global `rules`
- do not treat a `context.filename` early return inside the rule module as the primary scoping mechanism; that is only a safety backstop
- basename-addressable file-role rules such as `index.ts`, `constants.ts`, and `types.ts` are **override-scoped**, not global
- when adding a new rule, update `src/oxlint/README.md` so the enforcement model explains why the rule is global or override-scoped

## Delegated instructions

- rule-writing and rule-test instructions live in `rules/AGENTS.md`

## Source of truth

When unsure, consult:

- Oxlint JS plugin docs
- ESLint 10+ plugin docs
- ESLint 10+ custom rule docs
