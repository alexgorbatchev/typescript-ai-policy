import { Command } from "commander";
import { runGuidanceCommand } from "./runGuidanceCommand.ts";
import type { GuidanceCommandOptions, TypescriptAiPolicyCliDependencies } from "../types.ts";

export function createGuidanceCommand(dependencies: TypescriptAiPolicyCliDependencies): Command {
  return new Command("guidance")
    .description("Print authoritative rule guidance for AI agents")
    .option("--json", "Print guidance as JSON")
    .action(async (options: GuidanceCommandOptions) => {
      await runGuidanceCommand(options, dependencies);
    });
}
