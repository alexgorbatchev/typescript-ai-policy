import { defineConfig } from "oxlint";

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
    "@alexgorbatchev/no-non-running-tests": "error",
    "@alexgorbatchev/no-module-mocking": "error",
    "@alexgorbatchev/no-test-file-exports": "error",
    "@alexgorbatchev/test-file-location-convention": "error",
    "@alexgorbatchev/tests-directory-file-convention": "error",
    "@alexgorbatchev/fixture-file-contract": "error",
    "@alexgorbatchev/fixture-export-naming-convention": "error",
    "@alexgorbatchev/fixture-export-type-contract": "error",
    "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
    "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
    "@alexgorbatchev/fixture-import-path-convention": "error",
    "@alexgorbatchev/no-local-type-declarations-in-fixture-files": "error",
    "@alexgorbatchev/single-fixture-entrypoint": "error",
    "typescript/no-explicit-any": "error",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "jest/no-disabled-tests": "error",
        "jest/no-focused-tests": "error",
      },
    },
  ],
});

export default oxlintConfig;
