import { describe, it } from "bun:test";
import { expectLintTargetFailure } from "../test-support/expectLintTargetResult.ts";
import { runLintTargetFixture } from "../test-support/runLintTargetFixture.ts";

describe("type-policy lint-target integration", () => {
  it("reports trivial exported forwarding functions through the shared config", () => {
    const lintTargetResult = runLintTargetFixture("no-trivial-forwarding-function/trivial-exported-wrapper-invalid");

    expectLintTargetFailure(lintTargetResult, [
      {
        column: 17,
        filePath: "src/readDevtoolsComponentEditor.ts",
        line: 5,
        message:
          "Delete this trivial forwarding function. Inline the forwarded property access at the call site or move real ownership logic into this function.",
        ruleId: "@alexgorbatchev(no-trivial-forwarding-function)",
        severity: "error",
      },
    ]);
  });
});
