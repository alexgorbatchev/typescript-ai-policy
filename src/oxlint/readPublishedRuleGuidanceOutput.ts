import oxlintConfig from "./oxlint.config.ts";
import plugin from "./plugin.ts";
import { readConfiguredComponentGlobs } from "./rules/helpers.ts";

export type PublishedRuleGuidanceEntry = {
  guidance: string;
  ruleName: string;
};

const MARKDOWN_BULLET_LINE_LENGTH = 80;
const MARKDOWN_BULLET_PREFIX = "- ";
const MARKDOWN_CONTINUATION_PREFIX = "  ";

type PublishedRuleGuidanceOutputOptions = {
  json?: boolean;
};

type GuidanceInterpolationContext = {
  componentGlobs: readonly string[];
};

type RuleModuleLike = {
  meta?: {
    docs?: unknown;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRuleModuleLike(value: unknown): value is RuleModuleLike {
  return isRecord(value);
}

function readGuidanceInterpolationContext(): GuidanceInterpolationContext {
  const settings = oxlintConfig.settings;
  const componentGlobs = isRecord(settings) ? readConfiguredComponentGlobs(settings) : [];

  return {
    componentGlobs,
  };
}

function readRuleGuidanceTemplate(ruleId: string, ruleModule: unknown): string {
  if (!isRuleModuleLike(ruleModule)) {
    throw new Error(`Rule @alexgorbatchev/${ruleId} is missing plugin metadata.`);
  }

  const docs = ruleModule.meta?.docs;
  if (!isRecord(docs)) {
    throw new Error(`Rule @alexgorbatchev/${ruleId} is missing meta.docs guidance metadata.`);
  }

  const guidance = Reflect.get(docs, "guidance");
  if (typeof guidance !== "string" || guidance.trim().length === 0) {
    throw new Error(`Rule @alexgorbatchev/${ruleId} is missing meta.docs.guidance.`);
  }

  return guidance;
}

function interpolateGuidanceTemplate(
  guidanceTemplate: string,
  guidanceInterpolationContext: GuidanceInterpolationContext,
): string {
  return guidanceTemplate.replaceAll("{{componentGlobs}}", guidanceInterpolationContext.componentGlobs.join(", "));
}

function readNormalizedGuidanceWords(guidance: string): string[] {
  return guidance.trim().split(/\s+/u);
}

function wrapMarkdownBulletLine(words: readonly string[]): string {
  return `${MARKDOWN_BULLET_PREFIX}${words.join(" ")}`;
}

function wrapMarkdownContinuationLine(words: readonly string[]): string {
  return `${MARKDOWN_CONTINUATION_PREFIX}${words.join(" ")}`;
}

function readWrappedMarkdownBulletLines(guidance: string): string[] {
  const guidanceWords = readNormalizedGuidanceWords(guidance);
  const wrappedLines: string[] = [];
  let currentLineWords: string[] = [];

  for (const guidanceWord of guidanceWords) {
    const nextLineWords = [...currentLineWords, guidanceWord];
    const currentWrappedLine =
      wrappedLines.length === 0 ? wrapMarkdownBulletLine(nextLineWords) : wrapMarkdownContinuationLine(nextLineWords);

    if (currentWrappedLine.length <= MARKDOWN_BULLET_LINE_LENGTH) {
      currentLineWords = nextLineWords;
      continue;
    }

    if (currentLineWords.length === 0) {
      currentLineWords = [guidanceWord];
      continue;
    }

    const completedLine =
      wrappedLines.length === 0
        ? wrapMarkdownBulletLine(currentLineWords)
        : wrapMarkdownContinuationLine(currentLineWords);
    wrappedLines.push(completedLine);
    currentLineWords = [guidanceWord];
  }

  const finalLine =
    wrappedLines.length === 0
      ? wrapMarkdownBulletLine(currentLineWords)
      : wrapMarkdownContinuationLine(currentLineWords);
  wrappedLines.push(finalLine);

  return wrappedLines;
}

function formatPublishedRuleGuidanceMarkdownBullet(publishedRuleGuidanceEntry: PublishedRuleGuidanceEntry): string {
  return readWrappedMarkdownBulletLines(publishedRuleGuidanceEntry.guidance).join("\n");
}

function readPublishedRuleGuidanceEntry(
  ruleId: string,
  ruleModule: unknown,
  guidanceInterpolationContext: GuidanceInterpolationContext,
): PublishedRuleGuidanceEntry {
  const guidanceTemplate = readRuleGuidanceTemplate(ruleId, ruleModule);

  return {
    guidance: interpolateGuidanceTemplate(guidanceTemplate, guidanceInterpolationContext),
    ruleName: `@alexgorbatchev/${ruleId}`,
  };
}

export function readPublishedRuleGuidanceOutput(options: PublishedRuleGuidanceOutputOptions = {}): string {
  const guidanceInterpolationContext = readGuidanceInterpolationContext();
  const publishedRuleGuidanceEntries = Object.entries(plugin.rules).map(([ruleId, ruleModule]) =>
    readPublishedRuleGuidanceEntry(ruleId, ruleModule, guidanceInterpolationContext),
  );

  if (options.json) {
    return `${JSON.stringify(publishedRuleGuidanceEntries)}\n`;
  }

  const ruleGuidanceBlocks = publishedRuleGuidanceEntries.map(formatPublishedRuleGuidanceMarkdownBullet);

  return `${ruleGuidanceBlocks.join("\n")}\n`;
}
