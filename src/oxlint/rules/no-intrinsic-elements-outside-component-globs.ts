import type { TSESTree } from "@typescript-eslint/utils";
import { isInsideConfiguredComponentGlob, isStoryOrTestTsxFile, readConfiguredComponentGlobs } from "./helpers.ts";
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
      description: "Ban intrinsic JSX elements outside configured component globs in TSX files",
      guidance:
        "Keep raw intrinsic JSX only in component-owned TSX files matched by your configured `componentGlobs`. Outside that surface, compose imported components instead of writing DOM markup directly.",
    },
    schema: [],
    messages: {
      noIntrinsicElementOutsideComponentDirectory:
        "Replace intrinsic JSX elements with imported components outside configured component globs. Keep raw DOM markup only in files matched by componentGlobs.",
    },
  },
  create(context) {
    const componentGlobs = readConfiguredComponentGlobs(context.settings);
    if (componentGlobs.length === 0 || isStoryOrTestTsxFile(context.filename)) {
      return {};
    }

    const isConfiguredComponentFile = isInsideConfiguredComponentGlob(context.filename, componentGlobs);
    if (isConfiguredComponentFile) {
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
