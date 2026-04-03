import type { RuleModule } from "./types.ts";

function readSuggestedTypeAliasName(typeAliasName: string): string {
  return typeAliasName.slice(1);
}

function hasBlockedTypeAliasPrefix(typeAliasName: string): boolean {
  return /^I[A-Z]/u.test(typeAliasName);
}

const noIPrefixedTypeAliasesRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Disallow repository-owned type alias names that start with an "I" followed by another capital letter',
    },
    schema: [],
    messages: {
      unexpectedTypeAliasName:
        'Rename type alias "{{ name }}" to remove the "I" prefix, for example "{{ suggestedName }}". Repository-owned type aliases must not use the interface-style "I[A-Z]" prefix.',
    },
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node) {
        const typeAliasName = node.id.name;
        if (!hasBlockedTypeAliasPrefix(typeAliasName)) {
          return;
        }

        context.report({
          node: node.id,
          messageId: "unexpectedTypeAliasName",
          data: {
            name: typeAliasName,
            suggestedName: readSuggestedTypeAliasName(typeAliasName),
          },
        });
      },
    };
  },
};

export default noIPrefixedTypeAliasesRule;
