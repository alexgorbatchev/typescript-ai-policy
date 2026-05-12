import createOxlintConfig from "./createOxlintConfig.ts";

export default createOxlintConfig(() => ({
  settings: {
    "@alexgorbatchev": {
      componentGlobs: ["__repository-placeholder__/**/*.tsx"],
    },
  },
}));
