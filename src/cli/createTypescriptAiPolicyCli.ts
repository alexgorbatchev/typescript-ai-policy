import { Command } from "commander";
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

  fixSemanticCommand.copyInheritedSettings(program);

  return program.addCommand(fixSemanticCommand);
}
