import { describe, expect, it } from "bun:test";
import createOxlintConfig from "../createOxlintConfig.ts";

describe("createOxlintConfig", () => {
  it("returns the shared lint defaults when no callback is provided", () => {
    const oxlintConfig = createOxlintConfig();

    expect(oxlintConfig.plugins).toEqual(["unicorn", "typescript", "oxc", "react", "jest"]);
    expect(oxlintConfig.jsPlugins).toEqual([
      {
        name: "@alexgorbatchev",
        specifier: "@alexgorbatchev/typescript-ai-policy/oxlint-plugin",
      },
    ]);
    expect(oxlintConfig.rules).toEqual({
      eqeqeq: "error",
      "@alexgorbatchev/no-react-create-element": "error",
      "@alexgorbatchev/no-imports-from-tests-directory": "error",
      "@alexgorbatchev/no-type-imports-from-constants": "error",
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "typescript/no-explicit-any": "error",
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.stories.tsx"],
      rules: {
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/component-file-contract": "off",
        "@alexgorbatchev/component-file-naming-convention": "off",
        "@alexgorbatchev/component-story-file-convention": "off",
        "import/no-default-export": "off",
        "@alexgorbatchev/story-file-location-convention": "error",
        "@alexgorbatchev/story-meta-type-annotation": "error",
        "@alexgorbatchev/story-export-contract": "error",
        "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
        "@alexgorbatchev/fixture-import-path-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.test.tsx"],
      rules: {
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/component-file-contract": "off",
        "@alexgorbatchev/component-file-naming-convention": "off",
        "@alexgorbatchev/component-story-file-convention": "off",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.{ts,tsx,mts,cts}"],
      rules: {
        "@alexgorbatchev/interface-naming-convention": "error",
        "@alexgorbatchev/no-i-prefixed-type-aliases": "error",
        "@alexgorbatchev/no-inline-type-expressions": "error",
        "@alexgorbatchev/require-template-indent": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/__tests__/*.test.{ts,tsx}", "**/__tests__/**/*.test.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/no-non-running-tests": "error",
        "@alexgorbatchev/no-conditional-logic-in-tests": "error",
        "@alexgorbatchev/no-throw-in-tests": "error",
        "@alexgorbatchev/no-test-file-exports": "error",
        "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
        "@alexgorbatchev/fixture-import-path-convention": "error",
        "jest/no-disabled-tests": "error",
        "jest/no-focused-tests": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.tsx"],
      rules: {
        "@alexgorbatchev/testid-naming-convention": "error",
        "@alexgorbatchev/require-component-root-testid": "error",
        "@alexgorbatchev/component-file-contract": "error",
        "@alexgorbatchev/component-file-naming-convention": "error",
        "@alexgorbatchev/component-story-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/use[A-Z]*.ts", "**/use[A-Z]*.tsx", "**/use-*.ts", "**/use-*.tsx"],
      rules: {
        "@alexgorbatchev/hook-file-contract": "error",
        "@alexgorbatchev/hook-file-naming-convention": "error",
        "@alexgorbatchev/hook-test-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/oxlint.config.ts", "**/oxfmt.config.ts"],
      rules: {
        "import/no-default-export": "off",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: [
        "**/__tests__/fixtures.{ts,tsx}",
        "**/__tests__/**/fixtures.{ts,tsx}",
        "**/stories/fixtures.{ts,tsx}",
        "**/stories/**/fixtures.{ts,tsx}",
      ],
      rules: {
        "@alexgorbatchev/fixture-file-contract": "error",
        "@alexgorbatchev/fixture-export-naming-convention": "error",
        "@alexgorbatchev/fixture-export-type-contract": "error",
      },
    });
  });

  it("allows additive user config without weakening shared rules", () => {
    const oxlintConfig = createOxlintConfig(() => ({
      ignorePatterns: ["coverage"],
      rules: {
        "no-var": "error",
      },
    }));

    expect(oxlintConfig.ignorePatterns).toEqual([
      "coverage",
      ".cache",
      ".venv",
      "**/.astro",
      "**/.react-email",
      "**/dist",
      "**/node_modules",
      "**/*.generated.ts",
      "**/*.gen.ts",
      "**/routeTree.gen.ts",
      "**/.vitepress/cache",
      "**/.vitepress/dist",
    ]);
    expect(oxlintConfig.rules).toEqual({
      "no-var": "error",
      eqeqeq: "error",
      "@alexgorbatchev/no-react-create-element": "error",
      "@alexgorbatchev/no-imports-from-tests-directory": "error",
      "@alexgorbatchev/no-type-imports-from-constants": "error",
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "typescript/no-explicit-any": "error",
    });
  });

  it("fails hard when a consumer tries to redefine a shared top-level rule", () => {
    expect(() =>
      createOxlintConfig(() => ({
        rules: {
          eqeqeq: "warn",
        },
      })),
    ).toThrow(
      "User oxlint config must extend the shared policy instead of redefining existing rules. Remove these rule entries: eqeqeq. If you need to change a shared rule, update @alexgorbatchev/typescript-ai-policy itself instead of overriding it in a consumer config.",
    );
  });

  it("fails hard when a consumer tries to redefine a shared override rule", () => {
    expect(() =>
      createOxlintConfig(() => ({
        overrides: [
          {
            files: ["**/*.ts"],
            rules: {
              "@alexgorbatchev/interface-naming-convention": "off",
            },
          },
        ],
      })),
    ).toThrow(
      "User oxlint config must extend the shared policy instead of redefining existing rules. Remove these rule entries: @alexgorbatchev/interface-naming-convention. If you need to change a shared rule, update @alexgorbatchev/typescript-ai-policy itself instead of overriding it in a consumer config.",
    );
  });
});
