import { describe, expect, it } from "bun:test";
import createOxfmtConfig from "../createOxfmtConfig.ts";

describe("createOxfmtConfig", () => {
  it("returns the shared formatter defaults when no callback is provided", () => {
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
  });

  it("preserves shared defaults while allowing additive user config", () => {
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
  });
});
