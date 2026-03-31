import { isInFixturesArea } from "./helpers.js";

const DECLARATION_MESSAGE_ID_BY_TYPE = {
  TSEnumDeclaration: "unexpectedEnumDeclaration",
  TSInterfaceDeclaration: "unexpectedInterfaceDeclaration",
  TSTypeAliasDeclaration: "unexpectedTypeAliasDeclaration",
};

const noLocalTypeDeclarationsInFixtureFilesRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: "Disallow local type aliases, interfaces, and enums anywhere in fixture files",
    },
    schema: [],
    messages: {
      unexpectedEnumDeclaration: "Fixture files must import enums from elsewhere instead of declaring them locally.",
      unexpectedInterfaceDeclaration:
        "Fixture files must import interfaces from elsewhere instead of declaring them locally.",
      unexpectedTypeAliasDeclaration:
        "Fixture files must import type aliases from elsewhere instead of declaring them locally.",
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
