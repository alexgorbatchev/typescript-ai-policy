import type { GuidanceCommandOptions, TypescriptAiPolicyCliDependencies } from "../types.ts";

export async function runGuidanceCommand(
  options: GuidanceCommandOptions,
  dependencies: TypescriptAiPolicyCliDependencies,
): Promise<void> {
  dependencies.writeStdout(dependencies.readPublishedRuleGuidanceOutput({ json: options.json ?? false }));
}
