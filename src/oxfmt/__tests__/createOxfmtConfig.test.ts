import { beforeEach, describe, expect, it } from "bun:test";
import createOxfmtConfig from "../createOxfmtConfig.ts";
import {
  readPackageUsageNotice,
  resetPackageUsageNoticeForTests,
  setPackageUsageNoticeWriterForTests,
} from "../../shared/packageUsageNotice.ts";

describe("createOxfmtConfig", () => {
  beforeEach(() => {
    resetPackageUsageNoticeForTests();
    setPackageUsageNoticeWriterForTests(() => {});
  });

  it("returns the shared formatter defaults when no callback is provided", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(createOxfmtConfig()).toEqual({
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      quoteProps: "as-needed",
      jsxSingleQuote: false,
      trailingComma: "all",
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: "always",
      endOfLine: "lf",
      sortPackageJson: false,
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("preserves shared defaults while allowing additive user config", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(
      createOxfmtConfig(() => ({
        printWidth: 80,
        singleQuote: true,
        ignorePatterns: ["vendor/**"],
        sortImports: {
          internalPattern: ["#/**"],
        },
      })),
    ).toEqual({
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      quoteProps: "as-needed",
      jsxSingleQuote: false,
      trailingComma: "all",
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: "always",
      endOfLine: "lf",
      sortPackageJson: false,
      ignorePatterns: ["vendor/**"],
      sortImports: {
        internalPattern: ["#/**"],
      },
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("prints the package usage notice only once per process", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    createOxfmtConfig();
    createOxfmtConfig();

    expect(stderr).toEqual([readPackageUsageNotice()]);
  });
});
