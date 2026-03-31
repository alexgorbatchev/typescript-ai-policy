# AGENTS

This directory contains the local **Oxlint JS rule modules** used by `../plugin.js`.

## Core rule-format contract

**Write rule files exactly like ESLint 9+ rule files, but keep them in JavaScript files.**

Oxlint's JS plugin API is documented as **ESLint v9+ compatible**. In practice, that means:

- Rule modules use the normal ESLint shape: `export default { meta, create(context) { ... } }`
- Rule files must stay as **`.js` ESM modules**; do not convert them to `.ts`, because Oxlint currently loads JavaScript plugins, not TypeScript source files
- Visitors are standard ESLint/ESTree visitors like `Program`, `CallExpression`, `JSXAttribute`, etc.
- `context.report(...)`, `messageId`, `fix(fixer)`, `schema`, `messages`, and `fixable` should be used exactly like normal ESLint 9+ rules
- `meta.messages` is required for stable testing; do not rely on ad-hoc raw messages

If you know how to write an ESLint 9+ custom rule, you already know how to write the Oxlint rules in this folder.

## Folder intent

- each `*.js` file in this directory is a single rule module
- `helpers.js` contains shared JavaScript helpers reused by multiple rules
- `../plugin.js` registers these rule modules under the plugin name

## Expected rule shape

```js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Describe the rule clearly',
    },
    schema: [],
    messages: {
      someMessage: 'Message text',
    },
    fixable: 'code',
  },
  create(context) {
    return {
      SomeAstNode(node) {
        context.report({
          node,
          messageId: 'someMessage',
        });
      },
    };
  },
};
```

## Rule-writing requirements

When adding or changing rules here:

1. Follow **ESLint 9+ custom rule conventions** first.
2. Keep each rule in its own `.js` file and export a single rule module as the default export.
3. Put reusable JavaScript helpers in `helpers.js` instead of duplicating them across rules.
4. Keep rule file names aligned with plugin rule ids in kebab-case whenever possible.
5. Prefer conventional ESLint-style rule ids: use `no-*` for bans, `require-*` for must-exist policies, and `*-convention` / `consistent-*` for naming or formatting rules.
6. Keep each rule focused on one repository policy.
7. Prefer clear `meta.docs.description`, `schema`, and `messages` over ad-hoc reporting.
8. Use `messageId` + `data` in `context.report(...)` when the rule defines `meta.messages`.
9. Put file-scoping exceptions in Oxlint config when possible, not inside rule heuristics.
10. If a rule is fixable, implement it with standard ESLint fixer callbacks.

## Source of truth

When unsure, consult:

- Oxlint JS plugin docs
- ESLint 9+ plugin docs
- ESLint 9+ custom rule docs

## Adjacent docs

- test-writing instructions live in `__tests__/AGENTS.md`
- plugin entrypoint guidance lives in `../AGENTS.md`

The important repo-specific assumption is simple:

> In this folder, **Oxlint rule files should be authored as ESLint 9+ lint files in JavaScript `.js` module format**.
