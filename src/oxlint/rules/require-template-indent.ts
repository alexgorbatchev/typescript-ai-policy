import type { TSESTree } from "@typescript-eslint/types";
import type { RuleFixer, RuleModule } from "./types.ts";

function readIndent(line: string): string {
  const indentMatch = line.match(/^[ \t]*/u);
  return indentMatch ? indentMatch[0] : "";
}

function readIndentSize(line: string): number {
  return readIndent(line).length;
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

function readTemplateContent(sourceText: string, node: TSESTree.TemplateLiteral): string {
  return sourceText.slice(node.range[0] + 1, node.range[1] - 1);
}

function startsWithNewline(templateContent: string): boolean {
  return templateContent.startsWith("\n");
}

function hasNonEmptyContent(templateContent: string): boolean {
  return templateContent.replace(/^\n/u, "").trim().length > 0;
}

function readFixedTemplateContent(templateContent: string, indentPrefix: string): string {
  const fixedContentLines = templateContent
    .replace(/^\n/u, "")
    .split("\n")
    .map((contentLine) => {
      if (contentLine.trim().length === 0) {
        return contentLine;
      }

      return `${indentPrefix}${contentLine}`;
    });

  return `\n${fixedContentLines.join("\n")}`;
}

function readTemplateIndentFix(
  fixer: RuleFixer,
  node: TSESTree.TemplateLiteral,
  templateContent: string,
  indentPrefix: string,
) {
  const fixedTemplateContent = readFixedTemplateContent(templateContent, indentPrefix);

  return fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], fixedTemplateContent);
}

const requireTemplateIndentRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Require multiline template literals to keep their content indented with the surrounding code",
    },
    schema: [],
    fixable: "code" as const,
    messages: {
      badIndent:
        'Indent this multiline template literal to match the surrounding code. If indentation is significant, normalize the string explicitly with "@alexgorbatchev/dedent-string" instead of relying on under-indented source text.',
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode?.() ?? context.sourceCode;
    const sourceText = sourceCode.getText();

    return {
      TemplateLiteral(node) {
        const templateContent = readTemplateContent(sourceText, node);
        if (!startsWithNewline(templateContent) || !hasNonEmptyContent(templateContent)) {
          return;
        }

        const startLine = node.loc?.start.line;
        if (!startLine) {
          return;
        }

        const sourceLine = sourceCode.getLines()[startLine - 1];
        if (!sourceLine) {
          return;
        }

        const lineIndent = readIndentSize(sourceLine);
        const contentIndent = readMinimumContentIndent(templateContent.replace(/^\n/u, ""));
        if (contentIndent >= lineIndent) {
          return;
        }

        const indentPrefix = readIndent(sourceLine).slice(0, lineIndent - contentIndent);

        context.report({
          node,
          messageId: "badIndent",
          fix(fixer) {
            return readTemplateIndentFix(fixer, node, templateContent, indentPrefix);
          },
        });
      },
    };
  },
};

export default requireTemplateIndentRule;
