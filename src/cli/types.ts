import type { ApplySemanticFixesOptions, ApplySemanticFixesResult } from "../semantic-fixes/types.ts";
import type { SemanticFixRuntimePaths } from "../semantic-fixes/readSemanticFixRuntimePaths.ts";

export type TypescriptAiPolicyCliDependencies = {
  applySemanticFixes: (options: ApplySemanticFixesOptions) => Promise<ApplySemanticFixesResult>;
  readSemanticFixRuntimePaths: () => SemanticFixRuntimePaths;
  writeStderr: (text: string) => void;
  writeStdout: (text: string) => void;
};

export type CliWrite = (text: string) => void;

export type FixSemanticCommandArguments = {
  dryRun: boolean;
  targetDirectoryPath: string;
};

export type FixSemanticCommandOptions = {
  dryRun?: boolean;
};
