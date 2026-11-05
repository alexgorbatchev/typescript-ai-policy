import { defineConfig } from "tsdown";
import { BUILD_ENTRIES } from "./scripts/constants.ts";

export default defineConfig({
  deps: {
    neverBundle: true,
  },
  dts: {
    resolver: "tsc",
  },
  entry: BUILD_ENTRIES,
  format: ["esm"],
  hash: false,
  outExtensions: () => ({
    dts: ".d.ts",
    js: ".js",
  }),
  platform: "node",
});
