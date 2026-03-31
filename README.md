# @alexgorbatchev/typescript-common

Shared Oxfmt and Oxlint configs for reuse across projects.

## Install

```bash
bun add -d @alexgorbatchev/typescript-common oxfmt oxlint
```

## Use

`oxfmt.config.ts`

```ts
export { default } from "@alexgorbatchev/typescript-common/oxfmt-config";
```

`oxlint.config.ts`

```ts
export { default } from "@alexgorbatchev/typescript-common/oxlint-config";
```

## Local package setup

This package also uses its own shared configs at the repository root:

- `oxfmt.config.ts`
- `oxlint.config.ts`

Available script:

```bash
bun run check
```

`check` runs:

- `oxfmt --check .`
- `oxlint .`
- `tsgo --noEmit`
- `bun test`

## Exports

- `@alexgorbatchev/typescript-common/oxfmt-config`
- `@alexgorbatchev/typescript-common/oxlint-config`
- `@alexgorbatchev/typescript-common/oxlint-plugin`

The shared Oxlint config includes the custom React and test-policy plugin rules automatically.

## Included Oxlint rules

### `@alexgorbatchev/testid-naming-convention`

Enforces React test ids to use the component name as the prefix:

- root elements: `ComponentName`
- child elements: `ComponentName--thing`

This rule is fixable for static string values.

### `@alexgorbatchev/no-react-create-element`

Bans `createElement` in regular application code:

- `import { createElement } from "react"`
- `React.createElement(...)`

Use JSX instead.

### `@alexgorbatchev/require-component-root-testid`

Enforces React component test-id structure:

- exported components must render a root `data-testid` or `testId` exactly equal to `ComponentName`
- child test ids must use `ComponentName--thing`
- fragment roots and other non-element roots are rejected for exported components
- local component roots must also use the plain component-name root test id

### `jest/no-disabled-tests` and `jest/no-focused-tests`

Enabled for `*.test.ts` and `*.test.tsx` files to block disabled and focused Jest-style test syntax such as:

- `it.skip(...)`
- `test.skip(...)`
- `describe.skip(...)`
- `xit(...)`
- `xtest(...)`
- `xdescribe(...)`
- `it.only(...)`
- `test.only(...)`
- `describe.only(...)`
- `fit(...)`
- `fdescribe(...)`

### `@alexgorbatchev/no-non-running-tests`

Closes the remaining skip/todo gap in `*.test.ts` and `*.test.tsx` files that the Jest rules do not cover:

- `test.skipIf(...)`
- `describe.if(...)`
- `it.todo(...)`
- `test.todoIf(...)`

### `@alexgorbatchev/no-module-mocking`

Bans whole-module mocking across common test interfaces and steers tests toward dependency injection instead:

- `jest.mock(...)`
- `jest.doMock(...)`
- `jest.setMock(...)`
- `jest.createMockFromModule(...)`
- `jest.enableAutomock(...)`
- `jest.unstable_mockModule(...)`
- `vi.mock(...)`
- `vi.doMock(...)`
- `vi.importMock(...)`
- `mock.module(...)`
- `t.mock.module(...)`

### `@alexgorbatchev/no-test-file-exports`

Prohibits exports from `*.test.ts` and `*.test.tsx` files.

Move shared test code into:

- `helpers.ts`
- `fixtures.ts`
- `fixtures/`

### `@alexgorbatchev/test-file-location-convention`

Requires actual test files to:

- live in a sibling `__tests__/` directory
- use the `*.test.ts` or `*.test.tsx` suffix

### `@alexgorbatchev/tests-directory-file-convention`

Restricts `__tests__/` contents to:

- `*.test.ts`
- `*.test.tsx`
- `helpers.ts`
- `helpers.tsx`
- `fixtures.ts`
- `fixtures.tsx`
- anything under `fixtures/`
