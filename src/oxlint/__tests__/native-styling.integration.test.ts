import { describe, expect, it } from "bun:test";
import { runNativeIntegration } from "../rules/nativeStyling/__tests__/helpers.ts";

describe("native styling under the complete shared policy", () => {
  it("allows verified native primitives and render chains in owned components", () => {
    const result = runNativeIntegration("valid");
    expect({ exitCode: result.exitCode, issues: result.issues }).toEqual({ exitCode: 0, issues: [] });
  });

  it.each(["invalid", "unresolved"])("rejects unverified render targets in %s", (fixture) => {
    const result = runNativeIntegration(fixture);
    expect({ exitCode: result.exitCode, issues: result.issues }).toEqual({
      exitCode: 1,
      issues: [
        {
          column: 18,
          filePath: "src/components/NativeButton.tsx",
          line: 4,
          message: "Use layout components or variant props instead of passing className or style.",
          ruleId: "@alexgorbatchev(no-classname-style-props-outside-component-globs)",
          severity: "error",
        },
      ],
    });
  });
});
