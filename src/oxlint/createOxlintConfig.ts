import { defineConfig, type OxlintConfig } from "oxlint";
import { mergeConfig } from "../shared/mergeConfig.ts";
import { assertNoRuleCollisions } from "./assertNoRuleCollisions.js";

export type OxlintConfigCallback = () => OxlintConfig;

//
// The rules must be optimized for performance:
// - global rules are reserved for true ingress/leak policies that must inspect
//   arbitrary files
// - filename-addressable roles such as index barrels, constants files, and
//   types files belong in narrow overrides
//
const DEFAULT_OXLINT_CONFIG = defineConfig({
  ignorePatterns: [
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
  ],
  plugins: ["unicorn", "typescript", "oxc", "react", "jsx-a11y", "jest"],
  jsPlugins: [
    {
      name: "@alexgorbatchev",
      specifier: "@alexgorbatchev/typescript-ai-policy/oxlint-plugin",
    },
  ],
  rules: {
    eqeqeq: "error",
    "@alexgorbatchev/testid-naming-convention": "error",
    "@alexgorbatchev/no-react-create-element": "error",
    "@alexgorbatchev/require-component-root-testid": "error",
    "@alexgorbatchev/no-imports-from-tests-directory": "error",
    "@alexgorbatchev/no-type-imports-from-constants": "error",
    "@alexgorbatchev/component-file-location-convention": "error",
    "@alexgorbatchev/hook-export-location-convention": "error",
    "@alexgorbatchev/test-file-location-convention": "error",
    "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
    "typescript/no-explicit-any": "error",
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      rules: {
        "@alexgorbatchev/interface-naming-convention": "error",
        "@alexgorbatchev/no-inline-type-expressions": "error",
      },
    },
    {
      files: ["**/components/**/*.{ts,tsx}", "**/templates/**/*.{ts,tsx}", "**/layouts/**/*.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/component-directory-file-convention": "error",
      },
    },
    {
      files: ["**/components/*.tsx", "**/templates/*.tsx", "**/layouts/*.tsx"],
      rules: {
        "@alexgorbatchev/component-file-contract": "error",
        "@alexgorbatchev/component-file-naming-convention": "error",
        "@alexgorbatchev/component-test-file-convention": "error",
      },
    },
    {
      files: ["**/hooks/**/*.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/hooks-directory-file-convention": "error",
      },
    },
    {
      files: ["**/hooks/use*.ts", "**/hooks/use*.tsx"],
      rules: {
        "@alexgorbatchev/hook-file-contract": "error",
        "@alexgorbatchev/hook-file-naming-convention": "error",
        "@alexgorbatchev/hook-test-file-convention": "error",
      },
    },
    {
      files: ["**/index.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/index-file-contract": "error",
      },
    },
    {
      files: ["**/constants.{ts,tsx,mts,cts}", "**/constants.d.{ts,tsx,mts,cts}"],
      rules: {
        "@alexgorbatchev/no-type-exports-from-constants": "error",
      },
    },
    {
      files: ["**/types.{ts,tsx,mts,cts}", "**/types.d.{ts,tsx,mts,cts}"],
      rules: {
        "@alexgorbatchev/no-value-exports-from-types": "error",
      },
    },
    {
      files: ["**/__tests__/**"],
      rules: {
        "@alexgorbatchev/no-module-mocking": "error",
        "@alexgorbatchev/tests-directory-file-convention": "error",
      },
    },
    {
      files: ["**/__tests__/*.test.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/no-non-running-tests": "error",
        "@alexgorbatchev/no-test-file-exports": "error",
        "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
        "@alexgorbatchev/fixture-import-path-convention": "error",
        "jest/no-disabled-tests": "error",
        "jest/no-focused-tests": "error",
      },
    },
    {
      files: ["**/__tests__/fixtures.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/fixture-file-contract": "error",
        "@alexgorbatchev/fixture-export-naming-convention": "error",
        "@alexgorbatchev/fixture-export-type-contract": "error",
        "@alexgorbatchev/single-fixture-entrypoint": "error",
      },
    },
    {
      files: ["**/__tests__/fixtures.{ts,tsx}", "**/__tests__/fixtures/**/*.{ts,tsx}"],
      rules: {
        "@alexgorbatchev/no-local-type-declarations-in-fixture-files": "error",
      },
    },
  ],
});

export default function createOxlintConfig(callback?: OxlintConfigCallback): OxlintConfig {
  const userConfig = callback?.() ?? defineConfig({});

  assertNoRuleCollisions(userConfig, DEFAULT_OXLINT_CONFIG);

  return defineConfig(mergeConfig(userConfig, DEFAULT_OXLINT_CONFIG));
}
