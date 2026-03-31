# AGENTS

This directory contains the local **Oxlint JS plugin** for this package.

## Folder intent

- `plugin.js` is the JavaScript plugin entrypoint that registers the local rules under a plugin name
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

**Keep the plugin entrypoint in JavaScript `.js` ESM format.**

Oxlint JS plugins are authored with an ESLint 10+ compatible plugin shape, so `plugin.js` should look like:

```js
const plugin = {
  meta: { name: "..." },
  rules: { "...": ruleModule },
};

export default plugin;
```

## Delegated instructions

- rule-writing and rule-test instructions live in `rules/AGENTS.md`

## Source of truth

When unsure, consult:

- Oxlint JS plugin docs
- ESLint 10+ plugin docs
- ESLint 10+ custom rule docs
