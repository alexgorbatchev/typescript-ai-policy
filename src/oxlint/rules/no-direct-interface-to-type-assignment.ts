import type { RuleModule } from "./types.ts";

function isInterfaceName(name: string): boolean {
  return /^I[A-Z]/u.test(name);
}

const noDirectInterfaceToTypeAssignmentRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow assigning interfaces directly to type aliases",
    },
    schema: [],
    messages: {
      unexpectedDirectInterfaceAssignment:
        "Remove this useless passthrough type alias. Assigning an interface directly to a type alias provides no type-level benefit and adds unnecessary indirection.",
    },
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node) {
        if (node.typeAnnotation.type !== "TSTypeReference") {
          return;
        }

        if (node.typeAnnotation.typeName.type !== "Identifier") {
          return;
        }

        const referencedName = node.typeAnnotation.typeName.name;

        if (isInterfaceName(referencedName)) {
          context.report({
            node: node.id,
            messageId: "unexpectedDirectInterfaceAssignment",
          });
        }
      },
    };
  },
};

export default noDirectInterfaceToTypeAssignmentRule;
