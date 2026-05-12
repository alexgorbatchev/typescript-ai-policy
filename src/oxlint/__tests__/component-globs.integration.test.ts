import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "./expectLintTargetResult.ts";
import { runLintTargetFixtureWithConsumerConfig } from "./runLintTargetFixtureWithConsumerConfig.ts";

const FIXTURE_CONFIG_HEADER = {
  configPath: "<fixture-root>/oxlint.config.ts",
  targetPath: "<fixture-root>",
};

describe("configured component-glob lint-target integration", () => {
  it("reports intrinsic JSX and className/style props outside configured component globs while exempting stories and tests", () => {
    const lintTargetResult = runLintTargetFixtureWithConsumerConfig(
      "no-intrinsic-elements-outside-component-globs/outside-configured-component-globs-invalid",
      {
        "@alexgorbatchev": {
          componentGlobs: ["src/ui/components/**/*", "src/main.tsx"],
        },
      },
    );

    expectLintTargetFailure(
      lintTargetResult,
      [
        {
          column: 11,
          filePath: "src/app/AppShell.tsx",
          line: 2,
          message:
            "Replace intrinsic JSX elements with imported components outside configured component globs. Keep raw DOM markup only in files matched by componentGlobs.",
          ruleId: "@alexgorbatchev(no-intrinsic-elements-outside-component-globs)",
          severity: "error",
        },
        {
          column: 38,
          filePath: "src/app/RouteShell.tsx",
          line: 4,
          message:
            "Move styling into a component matched by componentGlobs. Expose necessary variants instead of passing styling props here.",
          ruleId: "@alexgorbatchev(no-classname-style-props-outside-component-globs)",
          severity: "error",
        },
      ],
      FIXTURE_CONFIG_HEADER,
    );
  });
});
