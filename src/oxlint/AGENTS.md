# AGENTS

This directory contains the local **Oxlint JS plugin** for this package.

## Folder intent

- `plugin.js` is the JavaScript plugin entrypoint that registers the local rules under a plugin name
- `rules/` contains the individual Oxlint rule modules
- `rules/__tests__/` contains Bun + `RuleTester` tests for those rules

## Plugin-format contract

**Keep the plugin entrypoint in JavaScript `.js` ESM format.**

Oxlint JS plugins are authored with an ESLint 9+ compatible plugin shape, so `plugin.js` should look like:

```js
const plugin = {
  meta: {
    name: 'your-plugin-name',
  },
  rules: {
    'rule-name': ruleModule,
  },
};

export default plugin;
```

## Delegated instructions

- rule-writing instructions live in `rules/AGENTS.md`
- rule-test instructions live in `rules/__tests__/AGENTS.md`

## Source of truth

When unsure, consult:

- Oxlint JS plugin docs
- ESLint 9+ plugin docs
- ESLint 9+ custom rule docs

The important repo-specific assumption is simple:

> In this folder, the Oxlint plugin entrypoint and rule modules stay in JavaScript `.js` module format.
