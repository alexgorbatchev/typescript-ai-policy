import { describe, expect, it } from "bun:test";
import createOxlintConfig from "../createOxlintConfig.ts";
import oxlintConfig from "../oxlint.config.ts";

describe("oxlint.config", () => {
  it("exports the shared lint defaults", () => {
    expect(oxlintConfig).toEqual(createOxlintConfig());
  });
});
