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

## Mandatory red/green workflow for policy changes

**Every policy change in this directory must be developed red/green. No exceptions.**

If you add, tighten, relax, or re-scope a rule or its config wiring, do the work in this order:

1. **Write or update the test first** so it captures the intended policy change.
2. **Run the test and observe it fail** against the current implementation. This is the required **red** state.
3. **Only after the failure is proven**, change the rule/config/docs to implement the policy.
4. **Run the same test again and make it pass.** This is the required **green** state.
5. **Run the broader affected suite** so the policy still works as part of the whole system.

Do **not** change rule code first and “backfill” tests later. A policy change without a prior failing test is an invalid change process in this repository.

### What must go red first

- **Rule semantics change** → start with a `RuleTester` test in `__tests__/` for the rule module.
- **Config wiring / override scope / file-role behavior change** → start with an integration test under `src/oxlint/__tests__/` that exercises the real shared config.
- **Cross-rule or whole-policy behavior change** → add both:
  - the narrow `RuleTester` coverage for the local rule behavior
  - the integration coverage for the full configured policy surface

### Integration-test requirement

If the change affects any of the following, you must add or update the lint-target integration harness first and prove the failing case there before fixing implementation:

- override `files` globs
- rule enable/disable scope
- interactions between story, test, hook, fixture, or component file roles
- conflicts where one rule reports a file that should be owned by another rule
- any bug that reproduces only when the full shared config is loaded

### Minimum validation commands

Run the smallest relevant red/green command first, then the broader validation:

- Single rule test: `bun test src/oxlint/rules/__tests__/my-rule.test.ts`
- Shared-config integration tests: `bun test src/oxlint/__tests__`
- Full repository validation: `bun run check`

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
