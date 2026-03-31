import { defineConfig, type OxfmtConfig } from "oxfmt";
import { mergeConfig } from "../shared/mergeConfig.ts";

export type OxfmtConfigCallback = () => OxfmtConfig;

const DEFAULT_OXFMT_CONFIG = defineConfig({
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

export default function createOxfmtConfig(callback?: OxfmtConfigCallback): OxfmtConfig {
  const userConfig = callback?.() ?? defineConfig({});

  return defineConfig(mergeConfig(userConfig, DEFAULT_OXFMT_CONFIG));
}
