import type { TestLanguageOptions } from "@typescript-eslint/rule-tester";

export const languageOpts: TestLanguageOptions = {
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: "module",
  },
};
