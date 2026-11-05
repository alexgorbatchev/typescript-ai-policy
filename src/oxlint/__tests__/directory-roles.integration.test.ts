import { describe, expect, it } from "bun:test";
import { expectLintTargetFailure } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "../test-support/runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

describe("canonical directory roles under the complete shared policy", () => {
  it("allows grouped stories, local helpers and fixtures, component tests, and feature hooks", () => {
    const result = runLintTargetFixtureWithConsumerConfig("directory-roles/valid-local-roles", {});

    expect(result).toMatchObject({ exitCode: 0, header: FIXTURE_CONFIG_HEADER, issues: [] });
  });

  it("retains strict support-role checks after component-area classification", () => {
    const result = runLintTargetFixtureWithConsumerConfig("directory-roles/invalid-support-roles", {});

    expectLintTargetFailure(
      result,
      [
        {
          column: 1,
          filePath: "src/accounts/components/helpers.ts",
          line: 1,
          message:
            'Keep component ".tsx" files and "constants.ts", "index.ts", or "types.ts" in component areas. Place stories, tests, and hooks in their canonical "stories/", "__tests__/", or "hooks/" subtrees.',
          ruleId: "@alexgorbatchev(component-directory-file-convention)",
          severity: "error",
        },
        {
          column: 1,
          filePath: "src/accounts/components/feature/hooks/utils.ts",
          line: 1,
          message: 'Only "useThing.ts{,x}", "index.ts", "types.ts", and "__tests__/**" are allowed in "hooks/".',
          ruleId: "@alexgorbatchev(hooks-directory-file-convention)",
          severity: "error",
        },
        {
          column: 1,
          filePath: "src/accounts/components/__tests__/runtime.ts",
          line: 1,
          message:
            'Only "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" are allowed in "__tests__/".',
          ruleId: "@alexgorbatchev(tests-directory-file-convention)",
          severity: "error",
        },
        {
          column: 1,
          filePath: "src/accounts/components/__tests__/types.ts",
          line: 1,
          message:
            'Only "*.test.ts{,x}", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" are allowed in "__tests__/".',
          ruleId: "@alexgorbatchev(tests-directory-file-convention)",
          severity: "error",
        },
        {
          column: 1,
          filePath: "src/accounts/components/stories/catalog/runtime.ts",
          line: 1,
          message:
            'Keep only "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" in each "stories/" catalog group. Move runtime modules outside the story tree.',
          ruleId: "@alexgorbatchev(stories-directory-file-convention)",
          severity: "error",
        },
        {
          column: 1,
          filePath: "src/accounts/components/stories/catalog/helpers.js",
          line: 1,
          message:
            'Keep only "*.stories.tsx", "helpers.ts{,x}", "fixtures.ts{,x}", and "fixtures/**" in each "stories/" catalog group. Move runtime modules outside the story tree.',
          ruleId: "@alexgorbatchev(stories-directory-file-convention)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
