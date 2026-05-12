import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { runFixSemanticCommand } from "./runFixSemanticCommand.ts";
import type { FixSemanticCommandOptions, TypescriptAiPolicyCliDependencies } from "../types.ts";

function readTargetDirectoryPath(targetDirectoryArgument: string): string {
  const targetDirectoryPath = resolve(targetDirectoryArgument);

  if (!existsSync(targetDirectoryPath)) {
    throw new InvalidArgumentError(`Target directory does not exist: ${targetDirectoryPath}`);
  }

  if (!statSync(targetDirectoryPath).isDirectory()) {
    throw new InvalidArgumentError(`Target path is not a directory: ${targetDirectoryPath}`);
  }

  return targetDirectoryPath;
}

export function createFixSemanticCommand(dependencies: TypescriptAiPolicyCliDependencies): Command {
  return new Command("fix-semantic")
    .description("Apply safe semantic fixes for supported policy diagnostics")
    .argument("<target-directory>", "Target directory to lint and fix", readTargetDirectoryPath)
    .option("--dry-run", "Print planned fix scope without mutating files")
    .action(async (targetDirectoryPath: string, options: FixSemanticCommandOptions) => {
      await runFixSemanticCommand(
        {
          dryRun: options.dryRun ?? false,
          targetDirectoryPath,
        },
        dependencies,
      );
    });
}
