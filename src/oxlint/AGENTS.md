# src/oxlint

Local Oxlint plugin entrypoint (`plugin.ts`), shared Oxlint config creation (`createOxlintConfig.ts`), and integration test harness.

## Commands

- Run integration tests: `bun test src/oxlint/__tests__`
- Check all: `bun run check`

## Local conventions

- Plugin entrypoint: `plugin.ts` is the TypeScript ESM plugin entrypoint registering rules under plugin name `@alexgorbatchev`.
- Rule activation scope: Classify rule scope before wiring in `oxlint.config.ts`. Override-scope file-role rules (`index.ts`, `constants.ts`, `types.ts`) using narrow `overrides[].files`. Reserve global `rules` for true ingress/leak rules.
- Filename early returns in rule modules are safety backstops, not primary scoping mechanisms.

## Local gotchas

- Documentation sync: Updating rules or config requires updating `src/oxlint/README.md` and root `README.md` to keep enabled rule descriptions and enforcement models in sync.

## Boundaries

- Always: any time code is changed such that results from running that code are changed, a test file must be changed as well; 90% code coverage is required (scripts/ folder is excluded from this rule)
- Ask first: adding new global rules or changing rule override scopes in `oxlint.config.ts`
- Never: use CJS format or raw `.js` for plugin entrypoint; keep `plugin.ts` as TypeScript ESM

## References

- `src/oxlint/rules/AGENTS.md`
- `src/oxlint/README.md`
- `AGENTS.md`
