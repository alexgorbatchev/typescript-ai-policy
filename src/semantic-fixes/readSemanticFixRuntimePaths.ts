import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SemanticFixRuntimePaths = {
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  tscExecutablePath: string;
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
  let tscPackageRootPath: string;
  try {
    tscPackageRootPath = readInstalledPackageRootPath("@typescript/native", "");
  } catch {
    tscPackageRootPath = readInstalledPackageRootPath(
      "typescript",
      'Missing peer dependency "typescript" or "@typescript/native". Install typescript 7+ (or use the @typescript/native alias) in the consuming project to use the semantic-fix CLI.',
    );
  }

  return {
    oxlintConfigPath: resolve(packageRootPath, "src/oxlint/oxlint.config.ts"),
    oxlintExecutablePath: resolve(oxlintPackageRootPath, "bin/oxlint"),
    tscExecutablePath: resolve(tscPackageRootPath, "bin/tsc"),
  };
}
