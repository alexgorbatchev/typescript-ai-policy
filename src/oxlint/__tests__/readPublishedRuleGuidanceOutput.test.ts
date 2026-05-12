import { expect, it } from "bun:test";
import { readPublishedRuleGuidanceOutput } from "../readPublishedRuleGuidanceOutput.ts";

it("formats plain-text guidance as a wrapped markdown bullet list without rule names", () => {
  const output = readPublishedRuleGuidanceOutput();
  const outputLines = output.trimEnd().split("\n");

  expect(output.startsWith("- ")).toBe(true);
  expect(output.includes("@alexgorbatchev/")).toBe(false);
  expect(outputLines.every((outputLine) => outputLine.length <= 80)).toBe(true);
});

it("prints authoritative published rule guidance for every local rule", () => {
  expect(readPublishedRuleGuidanceOutput()).toMatchInlineSnapshot(`
    "- Name root test ids after the owning component in PascalCase. Name descendant
      test ids as \`ComponentName--part-name\` and do not invent other separators or
      casing.
    - Write JSX. Do not call \`React.createElement\` directly in application code.
    - Put a \`data-testid\` on the root element returned by every ownership component.
      Use the component name itself as that root id.
    - Keep every committed test runnable by default. Remove \`.skip\`, conditional
      gating, and other non-running test modifiers.
    - Write tests as straight-line assertions. Replace branching with explicit
      fixtures, separate test cases, or \`assert()\`-based narrowing that always
      executes.
    - Assert failures with matchers and helpers instead of throwing manually. Remove
      direct \`throw\` statements from committed tests.
    - Indent multiline template literal content to match the surrounding code. Do
      not outdent raw template lines.
    - Do not mock whole modules. Inject dependencies or pass collaborators
      explicitly so tests exercise real module wiring.
    - Treat \`.test.ts\` and \`.test.tsx\` files as private test leaves. Remove exports
      and move shared helpers into non-test support modules.
    - Keep runtime code out of \`__tests__\` imports. Move reusable code to owned
      runtime modules and import it from there.
    - Use \`index.ts\` only as a boundary barrel. Re-export the owned public surface
      and do not place unrelated implementation logic there.
    - Keep \`constants.ts\` value-only. Import types from their owning domain modules
      instead of routing type imports through \`constants.ts\`.
    - Export values only from \`constants.ts\`. Move types and interfaces to owned
      type modules instead of leaking them through constants files.
    - Keep \`types.ts\` type-only. Move values, functions, and runtime objects to
      owned implementation modules.
    - Prefix repository-owned interfaces with \`I\` and use PascalCase after the
      prefix. Rename nonconforming interfaces instead of weakening the contract.
    - Reserve the \`I\` prefix for interfaces only. Rename \`type\` aliases to semantic
      names without \`I[A-Z]\`.
    - Do not alias an interface directly with \`type Alias = Interface\`. Reuse the
      interface name or define a real type shape with its own purpose.
    - Do not write inline structural type expressions at the use site when inference
      or a named declaration can carry the contract. Extract the contract to an
      owned named type when an explicit type is required.
    - Hoist type imports to explicit top-level \`import type\` declarations. Do not
      hide imported types inside inline \`import()\` expressions.
    - Keep component ownership files in the allowed location for their role. Move
      misplaced component files into the canonical component-owned area.
    - Keep component directories limited to files that belong to the component
      surface. Move unrelated file roles out of component directories.
    - Use ownership component files only for the component contract they own. Remove
      unrelated exports and keep the file focused on the component entrypoint.
    - Name component files after the component they export. Do not use ad-hoc
      filenames that hide ownership.
    - Place each component story alongside its owned component in the canonical
      story role. Do not scatter story files outside the expected component/story
      relationship.
    - Keep \`stories/\` directories limited to story files, approved helpers, and
      fixture support. Move unrelated files out of the story area.
    - Keep \`*.stories.tsx\` files under \`stories/\`. Move misplaced story files into
      the canonical story directory.
    - Annotate Storybook meta with the required typed form. Do not leave story meta
      untyped or loosely typed.
    - Set each story title from the owned component path and role. Do not invent
      ad-hoc Storybook titles.
    - Keep story exports limited to the approved Storybook surface. Remove helper
      exports and move support code out of story files.
    - Export hooks from the canonical hook ownership location. Do not leak hook
      exports from unrelated modules.
    - Keep hook directories limited to hook files and approved support files. Move
      unrelated roles out of hook-owned directories.
    - Use hook files only for the hook contract they own. Keep unrelated exports,
      components, and file roles out of hook ownership files.
    - Name hook files after the exported hook using the \`use...\` contract. Do not
      use filenames that hide or contradict hook ownership.
    - Place hook tests in the canonical adjacent \`__tests__\` role. Do not leave hook
      tests beside runtime hook files or in unrelated folders.
    - Keep committed tests under \`__tests__/\` and name them \`*.test.ts\` or
      \`*.test.tsx\`. Move misplaced test files into the canonical test area.
    - Keep \`__tests__\` directories limited to test files, approved helpers, and
      fixtures. Move runtime modules and unrelated files out of test directories.
    - Use \`fixtures.ts\`, \`fixtures.tsx\`, or fixture support files only for shared
      fixture data and factories. Keep test execution logic and unrelated exports
      out of fixture entrypoints.
    - Name fixture exports with the repository fixture prefixes. Use \`fixture_...\`
      for data and \`factory_...\` for factories.
    - Give fixture exports explicit types that expose the intended contract. Do not
      rely on anonymous or implicit fixture shapes.
    - Do not export fixture helpers outside fixture entrypoints under \`__tests__\` or
      \`stories\`. Move shared fixtures into the canonical fixture area.
    - Define shared fixtures in fixture support files and import them into tests or
      stories. Do not declare \`fixture_\` or \`factory_\` bindings inline inside
      consumer files.
    - Import fixtures through the canonical fixture entrypoint path. Do not reach
      into private fixture implementation files.
    - Do not declare new local types inside fixture files. Move shared contracts to
      their owning domain modules and import them.
    - Keep each fixture area behind a single entrypoint. Consolidate scattered
      fixture exports so consumers import from one canonical fixture module.
    - Fix policy violations in code instead of silencing the linter. Do not commit
      eslint or oxlint disable comments.
    - Keep \`className\` and \`style\` props only in component-owned TSX files matched
      by \`componentGlobs\`: __repository-placeholder__/**/*.tsx. Replace styling prop
      passthrough with owned component variants or styling APIs.
    - Keep raw intrinsic JSX only in component-owned TSX files matched by
      \`componentGlobs\`: __repository-placeholder__/**/*.tsx. Outside that surface,
      compose imported components instead of writing DOM markup directly.
    "
  `);
});
