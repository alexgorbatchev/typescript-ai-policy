---
created_on: 2026-11-05 03:25
last_modified: 2026-11-05 03:25
status: current
---

# src/oxlint/rules

Oxlint custom rule modules (`*.ts`), shared rule helpers (`helpers.ts`), and unit tests (`__tests__/*.test.ts`).

## Commands

- Test single rule: `just test src/oxlint/rules/__tests__/story-file-location-convention.test.ts`
- Test all rules: `just test src/oxlint/rules/__tests__`

Run these commands from the repository root. Use the test recipe so its supervisor owns temporary files, tool caches, and descendant processes; do not invoke `bun test` directly.

## Local conventions

- Format: Write rule modules in TypeScript `.ts` as ESLint 9+ compatible rules (`export default { meta, create(context) { ... } }`).
- Naming & IDs: Kebab-case filenames matching plugin rule IDs (`no-*` for bans, `require-*` for required patterns, `*-convention` / `consistent-*` for structure).
- Shared helpers: Place reusable AST/path helpers in `helpers.ts`.
- Steering diagnostics: Max 2 short, direct sentences. Do not include current token or identifier spelling in message text. Do not offer escape hatches or policy workarounds.
- Guidance: Put detailed context in `meta.docs.guidance` (contributes to `just run guidance`).
- Multi-line highlights: Override `loc` for large declarations to highlight only the first line.

## Local gotchas

- **Mandatory Red/Green Workflow:** Every rule or policy change MUST be developed red/green. Write or update the test first, verify it fails (RED), then implement the fix and verify it passes (GREEN). Never edit rule code before proving test failure.

## Boundaries

- Always: any time code is changed such that results from running that code are changed, a test file must be changed as well; 90% code coverage is required (scripts/ folder is excluded from this rule)
- Always: follow the mandatory red/green workflow for every rule or policy change
- Ask first: removing a rule or relaxing an existing steering check
- Never: rely on ad-hoc raw messages without `meta.messages`, or include current token/identifier spelling in reported diagnostics

## References

- `src/oxlint/AGENTS.md`
- `AGENTS.md`
