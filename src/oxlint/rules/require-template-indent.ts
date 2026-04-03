import type { TSESTree } from "@typescript-eslint/types";
import type { RuleModule } from "./types.ts";

function readIndentSize(line: string): number {
  const indentMatch = line.match(/^[ \t]*/u);
  return indentMatch ? indentMatch[0].length : 0;
}

function readMinimumContentIndent(content: string): number {
  const contentLines = content.split("\n");
  let minimumIndent = Number.POSITIVE_INFINITY;

  for (const contentLine of contentLines) {
    if (contentLine.trim().length === 0) {
      continue;
    }

    minimumIndent = Math.min(minimumIndent, readIndentSize(contentLine));
  }

  return Number.isFinite(minimumIndent) ? minimumIndent : 0;
}

function readTemplateContent(node: TSESTree.TemplateLiteral): string {
  return node.quasis.map((quasi) => quasi.value.raw).join("${...}");
}

function startsWithNewline(templateContent: string): boolean {
  return templateContent.startsWith("\n");
}

function hasNonEmptyContent(templateContent: string): boolean {
  return templateContent.replace(/^\n/u, "").trim().length > 0;
}

const requireTemplateIndentRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Require multiline template literals to keep their content indented with the surrounding code",
    },
    schema: [],
    messages: {
      badIndent:
        "Indent this multiline template literal to match the surrounding code. If leading whitespace is part of the intended value, normalize the string explicitly instead of relying on under-indented source text.",
    },
  },
  create(context) {
    const sourceLines = context.sourceCode.lines;

    return {
      TemplateLiteral(node) {
        const templateContent = readTemplateContent(node);
        if (!startsWithNewline(templateContent) || !hasNonEmptyContent(templateContent)) {
          return;
        }

        const startLine = node.loc?.start.line;
        if (!startLine) {
          return;
        }

        const sourceLine = sourceLines[startLine - 1];
        if (!sourceLine) {
          return;
        }

        const lineIndent = readIndentSize(sourceLine);
        const contentIndent = readMinimumContentIndent(templateContent.replace(/^\n/u, ""));
        if (contentIndent >= lineIndent) {
          return;
        }

        context.report({
          node,
          messageId: "badIndent",
        });
      },
    };
  },
};

export default requireTemplateIndentRule;
