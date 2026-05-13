import { beforeEach, describe, expect, it } from "bun:test";
import plugin from "../plugin.ts";
import {
  readPackageUsageNotice,
  resetPackageUsageNoticeForTests,
  setPackageUsageNoticeWriterForTests,
} from "../../shared/packageUsageNotice.ts";

describe("plugin", () => {
  beforeEach(() => {
    resetPackageUsageNoticeForTests();
    setPackageUsageNoticeWriterForTests(() => {});
  });

  it("prints the package usage notice when the plugin export is accessed", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(plugin.meta).toEqual({
      name: "@alexgorbatchev",
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("prints the package usage notice only once across repeated plugin access", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(Object.keys(plugin.rules).length).toBeGreaterThan(0);
    expect(plugin.meta).toEqual({
      name: "@alexgorbatchev",
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });
});
