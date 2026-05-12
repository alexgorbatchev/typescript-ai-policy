import { CommanderError } from "commander";
import { createTypescriptAiPolicyCli } from "./createTypescriptAiPolicyCli.ts";
import { applySemanticFixes } from "../semantic-fixes/applySemanticFixes.ts";
import { readSemanticFixRuntimePaths } from "../semantic-fixes/readSemanticFixRuntimePaths.ts";
import type { TypescriptAiPolicyCliDependencies } from "./types.ts";

const defaultDependencies: TypescriptAiPolicyCliDependencies = {
  applySemanticFixes,
  readSemanticFixRuntimePaths,
  writeStderr(text: string) {
    process.stderr.write(text);
  },
  writeStdout(text: string) {
    process.stdout.write(text);
  },
};

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runTypescriptAiPolicyCli(
  argv: readonly string[],
  dependencies: TypescriptAiPolicyCliDependencies = defaultDependencies,
): Promise<number> {
  const cli = createTypescriptAiPolicyCli(dependencies);

  if (argv.length <= 2) {
    cli.outputHelp({ error: true });
    return 1;
  }

  try {
    await cli.parseAsync([...argv]);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    dependencies.writeStderr(`${readErrorMessage(error)}\n`);
    return 1;
  }
}
