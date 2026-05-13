import type { ApplySemanticFixesOptions, ApplySemanticFixesResult } from "../semantic-fixes/types.ts";
import type { SemanticFixRuntimePaths } from "../semantic-fixes/readSemanticFixRuntimePaths.ts";

export type GuidanceCommandOptions = {
  json?: boolean;
};

export type GuidanceOutputOptions = {
  json?: boolean;
};

export type TypescriptAiPolicyCliDependencies = {
  applySemanticFixes: (options: ApplySemanticFixesOptions) => Promise<ApplySemanticFixesResult>;
  readPublishedRuleGuidanceOutput: (options?: GuidanceOutputOptions) => string;
  readSemanticFixRuntimePaths: () => SemanticFixRuntimePaths;
  runCheck: () => Promise<void>;
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
