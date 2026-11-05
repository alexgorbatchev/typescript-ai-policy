import { defineConfig } from "ts-unused";
import packageJson from "./package.json";
import { BUILD_ENTRIES } from "./scripts/constants.ts";

const outputSources = new Map<string, string>(
  Object.entries(BUILD_ENTRIES).flatMap(([output, source]) =>
    [".js", ".d.ts"].map((extension) => [`./dist/${output}${extension}`, source] as const),
  ),
);

export default defineConfig({
  packageMode: true,
  packageEntryPointSources: Object.fromEntries(
    Object.values(packageJson.exports).flatMap((conditions) =>
      Object.values(conditions).map((target) => {
        const source = outputSources.get(target);
        if (!source) throw new Error(`Package export has no build source: ${target}`);
        return [target, source];
      }),
    ),
  ),
});
