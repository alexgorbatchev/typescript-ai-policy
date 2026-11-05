# typescript-ai-policy

Shared Oxfmt and Oxlint configurations plus local Oxlint JS plugin enforcing codified policies for LLM-generated TypeScript.

## Shared commands

- Install dependencies with Bun 1.4.4: `bun install`
- Check all (format, lint, tsc, build, test): `bun run check`
- Run tests with owned temporary files and process cleanup: `bun run test` (append Bun test arguments to select files or enable coverage)
- Print agent guidance: `bun run cli -- guidance` (or `bun run cli -- guidance --json`)
- Lint target project: `./scripts/lint-target.sh /path/to/target` (or `bun run lint:target -- /path/to/target`)

## Workspace map

- `src/oxlint/` -> `src/oxlint/AGENTS.md` (plugin entrypoint, oxlint config, and integration tests)
- `src/oxlint/rules/` -> `src/oxlint/rules/AGENTS.md` (individual Oxlint rule modules and rule tests)

## Policy intent & conventions

- Purpose: Enforce codified policies for LLM-generated code so that agent output is deterministic, reviewable, structurally consistent, and automatically repairable.
- Explicit types over anonymous inline shapes: Prefer inference first; ban use-site inline structural type annotations; require named declarations for explicit contracts; require owned placement for shared types.
- Steering diagnostics: Rule messages must read as direct repair instructions for an LLM agent (what is wrong, repository contract violated, required shape, target file/directory location).
- Whole-policy compatibility: Evaluate enabled policy surface as one coupled system. Report any mutually incompatible rule interactions immediately to the user.
- Sibling registry sync: Keep sibling registry skills in `../ai-registry/skills/` (`storybook`, `react-development`, `react-testing`, `typescript-code-quality`, `typescript-testing`) synchronized whenever published guidance or contracts change.

## React Hook dependencies

- Enforce exhaustive Hook dependencies as errors in the shared policy; consumers inherit this rule.

## Tool compatibility

- Keep Oxfmt and Oxlint consumer compatibility in peer dependencies; test dependency upgrades with the shared configs and integration suite before widening supported ranges.
- Use `bun run test` for test execution. Its supervisor owns `POLICY_TEST_ROOT`, temporary files, tool caches, and descendant processes through success, failure, timeout, and cancellation. Fixture helpers use that root and dispose individual repositories when their synchronous operation finishes. Do not place test artifacts outside the assigned root or inherit caller cache paths in spawned tooling.
- Packaged-consumer tests need a separate disposable `POLICY_CONSUMER_ROOT` beneath the original OS temporary directory: Node module resolution walks past Git boundaries and otherwise finds this checkout's optional compiler peers. The supervisor owns and removes this tree after joining its children. If redirecting `TMPDIR` before launching the supervisor, first preserve the original OS temporary directory in `POLICY_CONSUMER_ROOT`. Ordinary fixtures remain under repository `.tmp`.

## Release gotchas

- Release protocol: Do not publish or push release tags without an explicit user request. Version in `package.json` and git tag must agree before tag creation. Edit GitHub Release notes after release.
- Policy tightening is major: Any change that causes an existing consumer to newly fail linting, type-checking, or config validation is a major SemVer bump.

## Shared boundaries

- Always: automatically record all new user instructions in the most appropriate `AGENTS.md` file immediately upon receipt (check with user if existing instructions conflict)
- Always: any time code is changed such that results from running that code are changed, a test file must be changed as well; 90% code coverage is required (scripts/ folder is excluded from this rule)
- Always: run `bun run check` before committing changes
- Ask first: releases, publishing npm tags, breaking config/rule surface changes, or relaxing enforced policies
- Never: publish or push release tags without explicit user request, or leave behind mutually incompatible rule configurations

## References

- `README.md`
- `src/oxlint/AGENTS.md`
- `src/oxlint/rules/AGENTS.md`
