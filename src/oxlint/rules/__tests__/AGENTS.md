# AGENTS

This directory contains **Bun + `RuleTester` tests** for the local Oxlint JS rules in `../`.

## Test-format contract

Use the same structure for every Oxlint rule test in this folder.

- Test files are **TypeScript**: `*.test.ts`
- Rule modules under test stay in **JavaScript** and are imported from `../*.js`
- Tests run with **Bun** and `@typescript-eslint/rule-tester`
- Prefer **`RuleTester` rule tests** over ad-hoc subprocess wrappers
- Do **not** invent one-off helpers like `runOxlint()` inside a test file when the same behavior can be expressed with `RuleTester`

## File naming

Keep the test file name aligned with the source rule file name:

- `../testid-naming-convention.js` → `testid-naming-convention.test.ts`
- `../no-react-create-element.js` → `no-react-create-element.test.ts`
- `../require-component-root-testid.js` → `require-component-root-testid.test.ts`

## Shared test helpers

Use the shared language options from:

- `./helpers.js`

Current shared export:

- `languageOpts`

Use it in every rule test instead of redefining inline `languageOptions` objects.

## Required test structure

Follow this pattern:

```ts
import { afterAll, describe, it } from 'bun:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { languageOpts } from './helpers.js';
import ruleModule from '../my-rule.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('my-rule', ruleModule, {
  valid: [
    {
      code: `export function Example() { return <div />; }`,
      filename: 'Example.tsx',
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `export function Example() { return <div bad />; }`,
      filename: 'Example.tsx',
      languageOptions: languageOpts,
      errors: [
        {
          messageId: 'someMessageId',
        },
      ],
      output: null,
    },
  ],
});
```

## Assertion rules

### Always use `messageId` + `data`

Assert rule errors with:

- `messageId`
- `data` when placeholders exist

Do **not** assert raw message strings in rule tests.
If a rule does not expose `meta.messages`, add `meta.messages` to the rule first and then test against `messageId`.

Example:

```ts
errors: [
  {
    messageId: 'invalidChildTestId',
    data: {
      componentName: 'ActionTray',
      candidate: 'WrongTray--action',
    },
  },
],
```

## Fixer expectations

- For **non-fixable** rules, set `output: null`
- For **fixable** rules, assert the exact fixed output string

Do not leave fixer behavior implicit.

## Fixture-writing rules

- Always provide a realistic `filename`
- Use explicit `import` / `export` syntax where relevant
- Use JSX/TSX snippets that reflect real component structure
- Keep each case focused on **one behavior** when possible
- Add both valid and invalid cases
- Cover root behavior, child behavior, and edge cases for structural rules

## Repository-specific expectations

- Test the **rule module directly** with `RuleTester`
- Import rule modules from `../*.js`, not through `plugin.js`
- Reuse `languageOpts` from `./helpers.js`
- Keep tests colocated in this `__tests__` directory
- Keep naming aligned between source rule files and test files

## When changing rules

If you add or tighten a rule:

1. Update or add the adjacent `*.test.ts` file
2. Reuse `languageOpts` from `./helpers.js`
3. Assert `messageId`/`data` where available
4. Run:

```bash
bun test src/oxlint/rules/__tests__/*.test.ts
```

## Anti-patterns

Do **not**:

- duplicate `languageOptions` objects across test files
- create ad-hoc Oxlint subprocess helpers inside individual tests
- assert partial messages
- skip `output` assertions on invalid cases
- import the rule through `plugin.js` when unit-testing the rule itself
- let one test case cover multiple unrelated behaviors when separate cases are clearer
