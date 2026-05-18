import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "bun:test";
import type { ExternalPluginEntry } from "oxlint";
import createOxlintConfig, { FilenameStyle } from "../createOxlintConfig.ts";
import {
  readPackageUsageNotice,
  resetPackageUsageNoticeForTests,
  setPackageUsageNoticeWriterForTests,
} from "../../shared/packageUsageNotice.ts";

type ExplicitJsPlugin = {
  name: string;
  specifier: string;
};

const DIST_OXLINT_CONFIG_TYPES_PATH = join(import.meta.dir, "../../../dist/oxlint-config.d.ts");
const DIST_OXLINT_CONFIG_RUNTIME_PATH = join(import.meta.dir, "../../../dist/oxlint-config.js");

function readValidUserConfig() {
  return {};
}

function readValidFactoryInput() {
  return { ...readValidUserConfig() };
}

function readValidUserConfigCallback() {
  return readValidUserConfig();
}

function assertIsExplicitJsPlugin(value: ExternalPluginEntry | undefined): asserts value is ExplicitJsPlugin {
  assert(value && typeof value !== "string", "Expected an explicit JS plugin specifier object.");
}

describe("createOxlintConfig", () => {
  beforeEach(() => {
    resetPackageUsageNoticeForTests();
    setPackageUsageNoticeWriterForTests(() => {});
  });

  it("returns the shared lint defaults without requiring consumer component settings", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(createOxlintConfig()).toEqual(createOxlintConfig(readValidFactoryInput()));
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("returns the shared lint defaults when called with the legacy callback shape", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    const oxlintConfig = createOxlintConfig(readValidUserConfigCallback);

    expect(oxlintConfig).toEqual(createOxlintConfig());
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("returns the shared lint defaults without consumer component settings", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    const oxlintConfig = createOxlintConfig(readValidFactoryInput());

    expect(oxlintConfig).toEqual(createOxlintConfig());
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("accepts FilenameStyle.PascalCase as the explicit default enum member", () => {
    expect(FilenameStyle.PascalCase).toBe(0);

    const oxlintConfig = createOxlintConfig({ filenameStyle: FilenameStyle.PascalCase });

    expect(oxlintConfig).toEqual(createOxlintConfig());
  });

  it("publishes FilenameStyle from the oxlint-config package entrypoint", () => {
    const publishedTypes = readFileSync(DIST_OXLINT_CONFIG_TYPES_PATH, "utf8");
    const publishedRuntime = readFileSync(DIST_OXLINT_CONFIG_RUNTIME_PATH, "utf8");

    expect(publishedTypes).toContain("FilenameStyle");
    expect(publishedTypes).toContain("export {");
    expect(publishedRuntime).toContain("export { FilenameStyle,");
  });

  it("returns the shared lint defaults", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    const oxlintConfig = createOxlintConfig(readValidFactoryInput());
    const jsPlugin = oxlintConfig.jsPlugins?.[0];

    expect(oxlintConfig.plugins).toEqual(["unicorn", "typescript", "oxc", "react", "jest"]);
    assertIsExplicitJsPlugin(jsPlugin);
    expect(jsPlugin).toEqual({
      name: "@alexgorbatchev",
      specifier: expect.any(String),
    });
    expect(jsPlugin?.specifier.endsWith("/src/oxlint/plugin.ts")).toBe(true);
    expect(oxlintConfig.rules).toEqual({
      eqeqeq: "error",
      "@alexgorbatchev/no-react-create-element": "error",
      "@alexgorbatchev/no-imports-from-tests-directory": "error",
      "@alexgorbatchev/no-type-imports-from-constants": "error",
      "@alexgorbatchev/hook-export-location-convention": ["error", { filenameStyle: "[use]PascalCase" }],
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "@alexgorbatchev/no-lint-disable-comments": "error",
      "typescript/no-explicit-any": "error",
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/stories/**/*.tsx"],
      rules: {
        "@alexgorbatchev/component-file-location-convention": "off",
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/component-file-contract": "off",
        "@alexgorbatchev/component-file-naming-convention": "off",
        "@alexgorbatchev/component-story-file-convention": "off",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.stories.tsx"],
      rules: {
        "@alexgorbatchev/component-file-location-convention": "off",
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/component-file-contract": "off",
        "@alexgorbatchev/component-file-naming-convention": "off",
        "@alexgorbatchev/component-story-file-convention": "off",
        "@alexgorbatchev/story-file-location-convention": "error",
        "@alexgorbatchev/story-meta-type-annotation": "error",
        "@alexgorbatchev/story-title-convention": "error",
        "@alexgorbatchev/story-export-contract": "error",
        "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
        "@alexgorbatchev/fixture-import-path-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/__tests__/**/*.tsx"],
      rules: {
        "@alexgorbatchev/component-file-location-convention": "off",
        "@alexgorbatchev/testid-naming-convention": "off",
        "@alexgorbatchev/require-component-root-testid": "off",
        "@alexgorbatchev/component-file-contract": "off",
        "@alexgorbatchev/component-file-naming-convention": "off",
        "@alexgorbatchev/component-story-file-convention": "off",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.test.tsx"],
      rules: {
        "@alexgorbatchev/component-file-location-convention": "off",
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
        "@alexgorbatchev/no-direct-interface-to-type-assignment": "error",
        "@alexgorbatchev/no-trivial-forwarding-function": "error",
        "@alexgorbatchev/no-inline-type-expressions": "error",
        "@alexgorbatchev/no-inline-type-imports": "error",
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
        "@alexgorbatchev/no-classname-style-props-outside-component-globs": "error",
        "@alexgorbatchev/no-intrinsic-elements-outside-component-globs": "error",
        "@alexgorbatchev/testid-naming-convention": "error",
        "@alexgorbatchev/require-component-root-testid": "error",
        "@alexgorbatchev/component-file-location-convention": "error",
        "@alexgorbatchev/component-file-contract": "error",
        "@alexgorbatchev/component-file-naming-convention": ["error", { filenameStyle: "[use]PascalCase" }],
        "@alexgorbatchev/component-story-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/components/**/*", "**/templates/**/*", "**/layouts/**/*"],
      rules: {
        "@alexgorbatchev/component-directory-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/stories/**/*"],
      rules: {
        "@alexgorbatchev/stories-directory-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/use[A-Z]*.ts", "**/use[A-Z]*.tsx"],
      rules: {
        "@alexgorbatchev/hook-file-contract": "error",
        "@alexgorbatchev/hook-file-naming-convention": ["error", { filenameStyle: "[use]PascalCase" }],
        "@alexgorbatchev/hook-test-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/hooks/**/*"],
      rules: {
        "@alexgorbatchev/hooks-directory-file-convention": ["error", { filenameStyle: "[use]PascalCase" }],
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/__tests__/**"],
      rules: {
        "@alexgorbatchev/no-module-mocking": "error",
        "@alexgorbatchev/tests-directory-file-convention": "error",
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
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("allows consumers to switch component and hook ownership filenames to dash-case", () => {
    const oxlintConfig = createOxlintConfig({ filenameStyle: FilenameStyle.DashCase });

    expect(oxlintConfig.rules).toMatchObject({
      "@alexgorbatchev/hook-export-location-convention": ["error", { filenameStyle: "dash-case" }],
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/*.tsx"],
      rules: {
        "@alexgorbatchev/no-classname-style-props-outside-component-globs": "error",
        "@alexgorbatchev/no-intrinsic-elements-outside-component-globs": "error",
        "@alexgorbatchev/testid-naming-convention": "error",
        "@alexgorbatchev/require-component-root-testid": "error",
        "@alexgorbatchev/component-file-location-convention": "error",
        "@alexgorbatchev/component-file-contract": "error",
        "@alexgorbatchev/component-file-naming-convention": ["error", { filenameStyle: "dash-case" }],
        "@alexgorbatchev/component-story-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/use-*.ts", "**/use-*.tsx"],
      rules: {
        "@alexgorbatchev/hook-file-contract": "error",
        "@alexgorbatchev/hook-file-naming-convention": ["error", { filenameStyle: "dash-case" }],
        "@alexgorbatchev/hook-test-file-convention": "error",
      },
    });

    expect(oxlintConfig.overrides).toContainEqual({
      files: ["**/hooks/**/*"],
      rules: {
        "@alexgorbatchev/hooks-directory-file-convention": ["error", { filenameStyle: "dash-case" }],
      },
    });
  });

  it("allows additive user config without weakening shared rules", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    const oxlintConfig = createOxlintConfig({
      ignorePatterns: ["coverage"],
      rules: {
        "no-var": "error",
      },
    });

    expect(oxlintConfig.ignorePatterns).toEqual([
      "coverage",
      ".tmp",
      "**/.tmp",
      "**/.tmp/**",
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
      "@alexgorbatchev/hook-export-location-convention": ["error", { filenameStyle: "[use]PascalCase" }],
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "@alexgorbatchev/no-lint-disable-comments": "error",
      "typescript/no-explicit-any": "error",
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("allows additive user config through the callback shape without weakening shared rules", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    const oxlintConfig = createOxlintConfig(() => ({
      ignorePatterns: ["coverage"],
      rules: {
        "no-var": "error",
      },
    }));

    expect(oxlintConfig.ignorePatterns).toEqual([
      "coverage",
      ".tmp",
      "**/.tmp",
      "**/.tmp/**",
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
      "@alexgorbatchev/hook-export-location-convention": ["error", { filenameStyle: "[use]PascalCase" }],
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "@alexgorbatchev/no-lint-disable-comments": "error",
      "typescript/no-explicit-any": "error",
    });
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("throws for invalid top-level input shapes instead of silently ignoring them", () => {
    expect(() => createOxlintConfig("bad-input" as unknown as never)).toThrow(
      "createOxlintConfig accepts either a config object or a callback that returns a config object.",
    );
  });

  it("throws for invalid filenameStyle values instead of silently falling back", () => {
    expect(() => createOxlintConfig({ filenameStyle: "kebab-case" as unknown as FilenameStyle })).toThrow(
      'Invalid filenameStyle. Expected one of: "[use]PascalCase", "dash-case".',
    );
  });

  it("fails hard when a consumer tries to redefine a shared top-level rule", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(() =>
      createOxlintConfig({
        rules: {
          eqeqeq: "warn",
        },
      }),
    ).toThrow(
      "User oxlint config must extend the shared policy instead of redefining existing rules. Remove these rule entries: eqeqeq. If you need to change a shared rule, update @alexgorbatchev/typescript-ai-policy itself instead of overriding it in a consumer config.",
    );
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("fails hard when a consumer tries to redefine a shared override rule", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    expect(() =>
      createOxlintConfig({
        overrides: [
          {
            files: ["**/*.ts"],
            rules: {
              "@alexgorbatchev/interface-naming-convention": "off",
            },
          },
        ],
      }),
    ).toThrow(
      "User oxlint config must extend the shared policy instead of redefining existing rules. Remove these rule entries: @alexgorbatchev/interface-naming-convention. If you need to change a shared rule, update @alexgorbatchev/typescript-ai-policy itself instead of overriding it in a consumer config.",
    );
    expect(stderr).toEqual([readPackageUsageNotice()]);
  });

  it("prints the package usage notice only once per process", () => {
    const stderr: string[] = [];

    setPackageUsageNoticeWriterForTests((text: string) => {
      stderr.push(text);
    });

    createOxlintConfig(readValidFactoryInput());
    createOxlintConfig(readValidUserConfigCallback);

    expect(stderr).toEqual([readPackageUsageNotice()]);
  });
});
