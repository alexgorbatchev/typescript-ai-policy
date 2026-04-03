import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SemanticFixRuntimePaths = {
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  tsgoExecutablePath: string;
};

const require = createRequire(import.meta.url);
const packageRootPath = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readInstalledPackageRootPath(packageName: string, resolutionFailureMessage: string): string {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    return dirname(packageJsonPath);
  } catch {
    throw new Error(resolutionFailureMessage);
  }
}

export function readSemanticFixRuntimePaths(): SemanticFixRuntimePaths {
  const oxlintPackageRootPath = readInstalledPackageRootPath(
    "oxlint",
    'Missing peer dependency "oxlint". Install oxlint in the consuming project so the semantic-fix CLI can run repository policy checks.',
  );
  const tsgoPackageRootPath = readInstalledPackageRootPath(
    "@typescript/native-preview",
    'Missing peer dependency "@typescript/native-preview". Install @typescript/native-preview in the consuming project to use the semantic-fix CLI.',
  );

  return {
    oxlintConfigPath: resolve(packageRootPath, "src/oxlint/oxlint.config.ts"),
    oxlintExecutablePath: resolve(oxlintPackageRootPath, "bin/oxlint"),
    tsgoExecutablePath: resolve(tsgoPackageRootPath, "bin/tsgo.js"),
  };
}
