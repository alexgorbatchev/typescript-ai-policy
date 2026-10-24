import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    neverBundle: true,
  },
  dts: {
    resolver: "tsc",
  },
  entry: {
    "bin/typescript-ai-policy": "src/cli/cli.ts",
    "oxfmt-config": "src/oxfmt/createOxfmtConfig.ts",
    "oxlint-config": "src/oxlint/createOxlintConfig.ts",
    "oxlint-plugin": "src/oxlint/plugin.ts",
    "semantic-fix-config": "src/oxlint/oxlint.config.ts",
  },
  format: ["esm"],
  hash: false,
  outExtensions: () => ({
    dts: ".d.ts",
    js: ".js",
  }),
  platform: "node",
});
