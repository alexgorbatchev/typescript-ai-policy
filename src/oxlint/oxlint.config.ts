import createOxlintConfig from "./createOxlintConfig.ts";

export default createOxlintConfig(() => ({
  settings: {
    "@alexgorbatchev": {
      componentGlobs: ["src/**/*.tsx"],
    },
  },
}));
