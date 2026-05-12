#!/usr/bin/env node

import { runTypescriptAiPolicyCli } from "./runTypescriptAiPolicyCli.ts";

export async function runTypescriptAiPolicyCliMain(): Promise<void> {
  process.exitCode = await runTypescriptAiPolicyCli(process.argv);
}

await runTypescriptAiPolicyCliMain();
