import { defineConfig } from "oxlint";

//
// The rules must be optimized for performance, meaning that rules should only
// run for files they are designed for (global rules do run globally of
// course).
// 
const oxlintConfig = defineConfig({
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
    "docs/.vitepress/cache",
    "docs/.vitepress/dist",
  ],
  plugins: ["unicorn", "typescript", "oxc", "react", "jsx-a11y", "jest"],
  jsPlugins: [
    {
      name: "@alexgorbatchev",
      specifier: "@alexgorbatchev/typescript-common/oxlint-plugin",
    },
  ],
  rules: {
    "no-console": "off",
    eqeqeq: "error",
    "jsx-a11y/no-autofocus": "off",
    "@alexgorbatchev/testid-naming-convention": "error",
    "@alexgorbatchev/no-react-create-element": "error",
    "@alexgorbatchev/require-component-root-testid": "error",
    "@alexgorbatchev/no-imports-from-tests-directory": "error",
    "@alexgorbatchev/no-type-imports-from-constants": "error",
    "@alexgorbatchev/no-type-exports-from-constants": "error",
    "@alexgorbatchev/no-value-exports-from-types": "error",
    "@alexgorbatchev/test-file-location-convention": "error",
    "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
    "typescript/no-explicit-any": "error",
  },
  overrides: [
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

export default oxlintConfig;
