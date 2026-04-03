import type { RuleModule } from "./types.ts";
import { isInFixturesArea } from "./helpers.ts";

const DECLARATION_MESSAGE_ID_BY_TYPE = {
  TSEnumDeclaration: "unexpectedEnumDeclaration",
  TSInterfaceDeclaration: "unexpectedInterfaceDeclaration",
  TSTypeAliasDeclaration: "unexpectedTypeAliasDeclaration",
};

const noLocalTypeDeclarationsInFixtureFilesRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Disallow local type aliases, interfaces, and enums anywhere in nested fixture files under "__tests__/" or "stories/"',
    },
    schema: [],
    messages: {
      unexpectedEnumDeclaration:
        "Remove this local enum declaration from the fixture file. Define it elsewhere and import it here.",
      unexpectedInterfaceDeclaration:
        "Remove this local interface declaration from the fixture file. Define it elsewhere and import it here.",
      unexpectedTypeAliasDeclaration:
        "Remove this local type alias declaration from the fixture file. Define it elsewhere and import it here.",
    },
  },
  create(context) {
    if (!isInFixturesArea(context.filename)) {
      return {};
    }

    return {
      TSEnumDeclaration(node) {
        context.report({
          node,
          messageId: DECLARATION_MESSAGE_ID_BY_TYPE[node.type],
        });
      },
      TSInterfaceDeclaration(node) {
        context.report({
          node,
          messageId: DECLARATION_MESSAGE_ID_BY_TYPE[node.type],
        });
      },
      TSTypeAliasDeclaration(node) {
        context.report({
          node,
          messageId: DECLARATION_MESSAGE_ID_BY_TYPE[node.type],
        });
      },
    };
  },
};

export default noLocalTypeDeclarationsInFixtureFilesRule;
