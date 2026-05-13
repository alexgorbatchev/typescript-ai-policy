import { Command } from "commander";
import { runCheckCommand } from "./runCheckCommand.ts";
import type { TypescriptAiPolicyCliDependencies } from "../types.ts";

export function createCheckCommand(dependencies: TypescriptAiPolicyCliDependencies): Command {
  return new Command("check").description("Run formatter and linter checks").action(async () => {
    await runCheckCommand(dependencies);
  });
}
