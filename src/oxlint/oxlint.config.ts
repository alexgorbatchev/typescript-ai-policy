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
  plugins: ["unicorn", "typescript", "oxc", "react", "jsx-a11y"],
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
    "typescript/no-explicit-any": "error",
  },
});

export default oxlintConfig;
