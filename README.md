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

The shared Oxlint config includes the custom React plugin rules automatically.

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
