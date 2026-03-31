import { describe, expect, it } from "bun:test";
import createOxfmtConfig from "../createOxfmtConfig.ts";
import oxfmtConfig from "../oxfmt.config.ts";

describe("oxfmt.config", () => {
  it("exports the shared formatter defaults", () => {
    expect(oxfmtConfig).toEqual(createOxfmtConfig());
  });
});
