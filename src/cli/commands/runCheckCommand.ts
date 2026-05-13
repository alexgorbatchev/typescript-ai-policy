import type { TypescriptAiPolicyCliDependencies } from "../types.ts";

export async function runCheckCommand(dependencies: TypescriptAiPolicyCliDependencies): Promise<void> {
  await dependencies.runCheck();
}
