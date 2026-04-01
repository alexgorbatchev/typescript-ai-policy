import type { OxlintConfig } from "oxlint";

function readRuleNames(config: OxlintConfig): Set<string> {
  const ruleNames = new Set<string>();

  if (config.rules) {
    for (const ruleName of Object.keys(config.rules)) {
      ruleNames.add(ruleName);
    }
  }

  if (config.overrides) {
    for (const overrideConfig of config.overrides) {
      if (!overrideConfig.rules) {
        continue;
      }

      for (const ruleName of Object.keys(overrideConfig.rules)) {
        ruleNames.add(ruleName);
      }
    }
  }

  return ruleNames;
}

export function assertNoRuleCollisions(userConfig: OxlintConfig, defaultConfig: OxlintConfig): void {
  const defaultRuleNames = readRuleNames(defaultConfig);
  const conflictingRuleNames = [...readRuleNames(userConfig)].filter((ruleName) => defaultRuleNames.has(ruleName));

  if (conflictingRuleNames.length === 0) {
    return;
  }

  conflictingRuleNames.sort();

  throw new Error(
    `User oxlint config must extend the shared policy instead of redefining existing rules. Remove these rule entries: ${conflictingRuleNames.join(", ")}. If you need to change a shared rule, update @alexgorbatchev/typescript-ai-policy itself instead of overriding it in a consumer config.`,
  );
}
