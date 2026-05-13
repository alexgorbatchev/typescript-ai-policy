import type { TSESTree } from "@typescript-eslint/utils";
import { isInComponentOwnershipDirectory, isStoryOrTestTsxFile } from "./helpers.ts";
import type { RuleModule } from "./types.ts";

function isIntrinsicJsxIdentifier(node: TSESTree.JSXIdentifier): boolean {
  const firstCharacter = node.name.at(0);
  return firstCharacter !== undefined && firstCharacter === firstCharacter.toLowerCase();
}

function isIntrinsicElementName(node: TSESTree.JSXOpeningElement["name"]): boolean {
  if (node.type === "JSXNamespacedName") {
    return true;
  }

  if (node.type !== "JSXIdentifier") {
    return false;
  }

  return isIntrinsicJsxIdentifier(node);
}

const noIntrinsicElementsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban intrinsic JSX elements outside canonical component areas in TSX files",
      guidance:
        "Keep raw intrinsic JSX only in component-owned TSX files inside canonical component areas. Outside that surface, compose imported components instead of writing DOM markup directly.",
    },
    schema: [],
    messages: {
      noIntrinsicElementOutsideComponentDirectory:
        "Replace intrinsic JSX elements with imported components outside canonical component areas. Keep raw DOM markup only inside component ownership files.",
    },
  },
  create(context) {
    if (isStoryOrTestTsxFile(context.filename)) {
      return {};
    }

    if (isInComponentOwnershipDirectory(context.filename)) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        if (!isIntrinsicElementName(node.name)) {
          return;
        }

        context.report({
          node: node.name,
          messageId: "noIntrinsicElementOutsideComponentDirectory",
        });
      },
    };
  },
};

export default noIntrinsicElementsOutsideComponentGlobsRuleModule;
