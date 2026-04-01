# AGENTS

This directory contains the local **Oxlint rule modules** used by `../plugin.ts`.

## Core rule-format contract

**Write rule files exactly like ESLint 9+ rule files, but keep them in TypeScript files.**

Oxlint's JS plugin API is documented as **ESLint v9+ compatible**. In practice, that means:

- Rule modules use the normal ESLint shape: `export default { meta, create(context) { ... } }`
- Rule files now live as **`.ts` ESM modules** in this repository
- Visitors are standard ESLint/ESTree visitors like `Program`, `CallExpression`, `JSXAttribute`, etc.
- `context.report(...)`, `messageId`, `fix(fixer)`, `schema`, `messages`, and `fixable` should be used exactly like normal ESLint 9+ rules
- `meta.messages` is required for stable testing; do not rely on ad-hoc raw messages

If you know how to write an ESLint 9+ custom rule, you already know how to write the Oxlint rules in this folder.

## Folder intent

- each `*.ts` file in this directory is a single rule module
- `helpers.ts` contains shared helpers reused by multiple rules
- `../plugin.ts` registers these rule modules under the plugin name
- `__tests__/` contains Bun + `RuleTester` tests for the local rules

## Expected rule shape

```js
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Describe the rule clearly",
    },
    schema: [],
    messages: {
      someMessage: "Message text",
    },
    fixable: "code",
  },
  create(context) {
    return {
      SomeAstNode(node) {
        context.report({
          node,
          messageId: "someMessage",
        });
      },
    };
  },
};
```

## Rule-writing requirements

When adding or changing rules here:

1. Follow **ESLint 9+ custom rule conventions** first.
2. Keep each rule in its own `.ts` file and export a single rule module as the default export.
3. Put reusable shared helpers in `helpers.ts` instead of duplicating them across rules.
4. Keep rule file names aligned with plugin rule ids in kebab-case whenever possible.
5. Prefer conventional ESLint-style rule ids: use `no-*` for bans, `require-*` for must-exist policies, and `*-convention` / `consistent-*` for naming or formatting rules.
6. Keep each rule focused on one repository policy.
7. Prefer clear `meta.docs.description`, `schema`, and `messages` over ad-hoc reporting.
8. Use `messageId` + `data` in `context.report(...)` when the rule defines `meta.messages`.
9. Put file-scoping exceptions in Oxlint config when possible, not inside rule heuristics.
10. If a rule applies to a path-glob-addressable file role such as `index.ts`, `constants.ts`, or `types.ts`, require narrow `overrides[].files` activation in `../oxlint.config.ts` instead of global `rules`.
11. If a rule is fixable, implement it with standard ESLint fixer callbacks.

## Rule test instructions

Use the same structure for every Oxlint rule test in `__tests__/`.

- Test files are **TypeScript**: `*.test.ts`
- Rule modules under test live in **TypeScript** and are imported from `../*.ts`
- Tests run with **Bun** and `@typescript-eslint/rule-tester`
- Prefer **`RuleTester` rule tests** over ad-hoc subprocess wrappers
- Use the shared language options from `./__tests__/helpers.ts`
- Do **not** invent one-off helpers like `runOxlint()` inside a test file when the same behavior can be expressed with `RuleTester`

### Required test structure

```ts
import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import ruleModule from "../my-rule.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("my-rule", ruleModule, {
  valid: [
    {
      code: `export function Example() { return <div />; }`,
      filename: "Example.tsx",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `export function Example() { return <div bad />; }`,
      filename: "Example.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "someMessageId",
        },
      ],
      output: null,
    },
  ],
});
```

### Assertion rules

- Assert rule errors with `messageId`
- Include `data` whenever the message contains placeholders
- For **non-fixable** rules, set `output: null`
- For **fixable** rules, assert the exact fixed output string

### Repository-specific expectations

- Test the **rule module directly** with `RuleTester`
- Import rule modules from `../*.ts`, not through `plugin.ts`
- Reuse `languageOpts` from `./__tests__/helpers.ts`
- Keep tests colocated in `__tests__/`
- Keep naming aligned between source rule files and test files

## Source of truth

When unsure, consult:

- Oxlint JS plugin docs
- ESLint 9+ plugin docs
- ESLint 9+ custom rule docs
- `../AGENTS.md` for plugin-entry guidance

The important repo-specific assumption is simple:

> In this folder, **Oxlint rule files are authored as ESLint 9+ lint files in TypeScript `.ts` module format**, and their tests live in `__tests__/` as `*.test.ts` files.
