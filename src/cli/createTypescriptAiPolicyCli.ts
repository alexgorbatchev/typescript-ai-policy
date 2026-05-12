import { Command } from "commander";
import { createGuidanceCommand } from "./commands/createGuidanceCommand.ts";
import { createFixSemanticCommand } from "./commands/createFixSemanticCommand.ts";
import type { CliWrite, TypescriptAiPolicyCliDependencies } from "./types.ts";

export function createTypescriptAiPolicyCli(dependencies: TypescriptAiPolicyCliDependencies): Command {
  const program = new Command().name("typescript-ai-policy").showHelpAfterError();

  program.configureOutput({
    outputError(text: string, write: CliWrite) {
      write(text);
    },
    writeErr(text: string) {
      dependencies.writeStderr(text);
    },
    writeOut(text: string) {
      dependencies.writeStdout(text);
    },
  });
  program.exitOverride();

  const fixSemanticCommand = createFixSemanticCommand(dependencies);
  const guidanceCommand = createGuidanceCommand(dependencies);

  fixSemanticCommand.copyInheritedSettings(program);
  guidanceCommand.copyInheritedSettings(program);

  program.addCommand(fixSemanticCommand);
  return program.addCommand(guidanceCommand);
}
