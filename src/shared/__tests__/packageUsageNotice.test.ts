import { describe, expect, it } from "bun:test";
import { readPackageUsageNotice } from "../packageUsageNotice.ts";

describe("readPackageUsageNotice", () => {
  it("includes the detected local package-manager command for guidance", () => {
    expect(readPackageUsageNotice()).toBe(
      "@alexgorbatchev/typescript-ai-policy@6.0.0 is being used, see 'bun x typescript-ai-policy guidance'\n",
    );
  });
});
