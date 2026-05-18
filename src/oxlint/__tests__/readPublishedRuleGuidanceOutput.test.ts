import { expect, it } from "bun:test";
import { readPublishedRuleGuidanceOutput } from "../readPublishedRuleGuidanceOutput.ts";

it("formats plain-text guidance as a wrapped markdown bullet list with bold rule names", () => {
  const output = readPublishedRuleGuidanceOutput();
  const outputLines = output.trimEnd().split("\n");

  expect(output.startsWith("- ")).toBe(true);
  expect(output.includes("- **@alexgorbatchev/")).toBe(true);
  expect(outputLines.every((outputLine) => outputLine.length <= 80)).toBe(true);
});

it("prints authoritative published rule guidance for every local rule", () => {
  expect(readPublishedRuleGuidanceOutput()).toMatchInlineSnapshot(`
    "- **@alexgorbatchev/testid-naming-convention**: Name root test ids after the
      owning component in PascalCase. Name descendant test ids as
      \`ComponentName--part-name\` and do not invent other separators or casing.
    - **@alexgorbatchev/no-react-create-element**: Write JSX. Do not call
      \`React.createElement\` directly in application code.
    - **@alexgorbatchev/require-component-root-testid**: Put a \`data-testid\` on the
      root element returned by every ownership component. Use the component name as
      that root id.
    - **@alexgorbatchev/no-non-running-tests**: Keep every committed test runnable
      by default. Remove \`.skip\`, conditional gating, and other non-running test
      modifiers.
    - **@alexgorbatchev/no-conditional-logic-in-tests**: Write tests as
      straight-line assertions. Replace branching with explicit fixtures, separate
      test cases, or \`assert()\`-based narrowing that always executes.
    - **@alexgorbatchev/no-throw-in-tests**: Assert failures with matchers and
      helpers instead of throwing manually. Remove direct \`throw\` statements from
      committed tests.
    - **@alexgorbatchev/require-template-indent**: Indent multiline template literal
      content to match the surrounding code. Normalize indentation explicitly when
      the resulting string must be left-aligned.
    - **@alexgorbatchev/no-module-mocking**: Do not mock whole modules. Inject
      dependencies or pass collaborators explicitly so tests exercise real module
      wiring.
    - **@alexgorbatchev/no-test-file-exports**: Treat \`.test.ts\` and \`.test.tsx\`
      files as private test leaves. Remove exports and move shared helpers into
      non-test support modules.
    - **@alexgorbatchev/no-imports-from-tests-directory**: Keep runtime code out of
      \`__tests__\` imports. Move reusable code to owned runtime modules and import it
      from there.
    - **@alexgorbatchev/index-file-contract**: Use \`index.ts\` only as a boundary
      barrel. Re-export the owned public surface and do not place unrelated
      implementation logic there.
    - **@alexgorbatchev/no-type-imports-from-constants**: Keep \`constants.ts\`
      value-only. Import types from their owning domain modules instead of routing
      type imports through \`constants.ts\`.
    - **@alexgorbatchev/no-type-exports-from-constants**: Export values only from
      \`constants.ts\`. Move types and interfaces to owned type modules instead of
      leaking them through constants files.
    - **@alexgorbatchev/no-value-exports-from-types**: Keep \`types.ts\` type-only.
      Move values, functions, and runtime objects to owned implementation modules.
    - **@alexgorbatchev/interface-naming-convention**: Prefix repository-owned
      interfaces with \`I\` and use PascalCase after the prefix. Rename nonconforming
      interfaces instead of weakening the contract.
    - **@alexgorbatchev/no-i-prefixed-type-aliases**: Reserve the \`I\` prefix for
      interfaces only. Rename \`type\` aliases to semantic names without \`I[A-Z]\`.
    - **@alexgorbatchev/no-direct-interface-to-type-assignment**: Do not alias an
      interface directly with \`type Alias = Interface\`. Reuse the interface name or
      define a real type shape with its own purpose.
    - **@alexgorbatchev/no-trivial-forwarding-function**: Do not keep functions
      whose whole body only returns a forwarded property read when the function name
      merely restates that property. Inline the property access at the call site or
      move real ownership logic into the function.
    - **@alexgorbatchev/no-inline-type-expressions**: Do not write inline structural
      type expressions at the use site. Reuse a named type, extract one, or rely on
      inference.
    - **@alexgorbatchev/no-inline-type-imports**: Hoist type imports to explicit
      top-level \`import type\` declarations. Do not hide imported types inside inline
      \`import()\` expressions.
    - **@alexgorbatchev/component-file-location-convention**: Keep non-hook,
      non-test ".tsx" ownership files under "components/", "templates/", or
      "layouts/". Move files for other roles to their canonical locations.
    - **@alexgorbatchev/component-directory-file-convention**: Keep "components/",
      "templates/", and "layouts/" limited to component ".tsx" ownership files,
      "constants.ts", "index.ts", "types.ts", nested component subdirectories, and
      sibling "stories/" trees. Move tests and other file roles to their canonical
      directories.
    - **@alexgorbatchev/component-file-contract**: Use component ownership files
      only for the component contract they own. Keep unrelated runtime exports out
      of the file.
    - **@alexgorbatchev/component-file-naming-convention**: Name each component
      ownership file after its exported PascalCase component. Use
      "ComponentName.tsx" by default, or "component-name.tsx" when the shared config
      uses \`FilenameStyle.DashCase\`. For multipart component families, use the
      shared family root name.
    - **@alexgorbatchev/component-story-file-convention**: Place each component
      story alongside its owned component in the canonical story role. Do not
      scatter story files outside the expected component/story relationship.
    - **@alexgorbatchev/stories-directory-file-convention**: Keep "stories/" limited
      to "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move
      runtime files and other support roles out of the story tree.
    - **@alexgorbatchev/story-file-location-convention**: Keep \`*.stories.tsx\` files
      under \`stories/\`. Move misplaced story files into the canonical story
      directory.
    - **@alexgorbatchev/story-meta-type-annotation**: Bind Storybook meta to a typed
      top-level const and default-export that identifier. Do not type story meta
      with object assertions.
    - **@alexgorbatchev/story-title-convention**: Set each story title from the
      owned component path and role. Do not invent ad-hoc Storybook titles.
    - **@alexgorbatchev/story-export-contract**: Keep story exports limited to the
      approved Storybook surface. Move helper bindings and support code out of story
      files.
    - **@alexgorbatchev/hook-export-location-convention**: Export hooks from
      direct-child "hooks/useThing.ts{,x}" ownership files by default, or
      "hooks/use-thing.ts{,x}" when the shared config uses \`FilenameStyle.DashCase\`.
      Do not leak hook exports from unrelated modules.
    - **@alexgorbatchev/hooks-directory-file-convention**: Keep hook directories
      limited to direct-child ownership files named "useThing.ts{,x}" by default, or
      "use-thing.ts{,x}" when the shared config uses \`FilenameStyle.DashCase\`, plus
      approved support files.
    - **@alexgorbatchev/hook-file-contract**: Use hook files only for the hook
      contract they own. Keep unrelated runtime exports and file roles out of hook
      ownership files.
    - **@alexgorbatchev/hook-file-naming-convention**: Name hook files after the
      exported hook using the \`use...\` contract. Use "useThing.ts{,x}" by default,
      or "use-thing.ts{,x}" when the shared config uses \`FilenameStyle.DashCase\`. Do
      not use filenames that hide or contradict hook ownership.
    - **@alexgorbatchev/hook-test-file-convention**: Place hook tests in the
      canonical adjacent \`__tests__\` role. Do not leave hook tests beside runtime
      hook files or in unrelated folders.
    - **@alexgorbatchev/test-file-location-convention**: Keep committed tests under
      \`__tests__/\` and name them \`*.test.ts\` or \`*.test.tsx\`. Move misplaced test
      files into the canonical test area.
    - **@alexgorbatchev/tests-directory-file-convention**: Keep "__tests__/" limited
      to "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/". Move
      runtime files and other support roles out of the test tree.
    - **@alexgorbatchev/fixture-file-contract**: Use \`fixtures.ts\`, \`fixtures.tsx\`,
      or fixture support files only for shared fixture data and factories. Keep test
      execution logic and unrelated exports out of fixture entrypoints.
    - **@alexgorbatchev/fixture-export-naming-convention**: Name fixture exports
      with the repository fixture prefixes. Use \`fixture_...\` for data and
      \`factory_...\` for factories.
    - **@alexgorbatchev/fixture-export-type-contract**: Give fixture exports
      explicit types that expose the intended contract. Do not rely on anonymous or
      implicit fixture shapes.
    - **@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint**: Do not
      export fixture helpers outside fixture entrypoints under \`__tests__\` or
      \`stories\`. Move shared fixtures into the canonical fixture area.
    - **@alexgorbatchev/no-inline-fixture-bindings-in-tests**: Define shared
      fixtures in fixture support files and import them into tests or stories. Do
      not declare \`fixture_\` or \`factory_\` bindings inline inside consumer files.
    - **@alexgorbatchev/fixture-import-path-convention**: Import fixtures through
      the canonical fixture entrypoint path. Do not reach into private fixture
      implementation files.
    - **@alexgorbatchev/no-local-type-declarations-in-fixture-files**: Do not
      declare new local types inside fixture files. Move shared contracts to their
      owning domain modules and import them.
    - **@alexgorbatchev/single-fixture-entrypoint**: Keep each fixture area behind a
      single entrypoint. Consolidate scattered fixture exports so consumers import
      from one canonical fixture module.
    - **@alexgorbatchev/no-lint-disable-comments**: Fix policy violations in code
      instead of silencing the linter. Do not commit eslint or oxlint disable
      comments.
    - **@alexgorbatchev/no-classname-style-props-outside-component-globs**: Keep
      \`className\` and \`style\` props only in component-owned TSX files inside
      canonical component areas. Expose variants or styling APIs instead of passing
      styling props outside that surface.
    - **@alexgorbatchev/no-intrinsic-elements-outside-component-globs**: Keep raw
      intrinsic JSX only in component-owned TSX files inside "components/",
      "templates/", or "layouts/". Outside that surface, compose imported components
      instead of writing DOM markup directly.
    "
  `);
});
