import { isInsideConfiguredComponentGlob, isStoryOrTestTsxFile, readConfiguredComponentGlobs } from "./helpers.ts";
import type { RuleModule } from "./types.ts";

const noClassNameStylePropsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Ban className and style props outside configured component globs in TSX files",
      guidance:
        "Keep `className` and `style` props only in component-owned TSX files matched by your configured `componentGlobs`. Replace styling prop passthrough with owned component variants or styling APIs.",
    },
    schema: [],
    messages: {
      noClassNameOrStylePropOutsideComponentDirectory:
        "Move styling into a component matched by componentGlobs. Expose necessary variants instead of passing styling props here.",
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
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (node.name.name !== "className" && node.name.name !== "style") {
          return;
        }

        context.report({
          node: node.name,
          messageId: "noClassNameOrStylePropOutsideComponentDirectory",
        });
      },
    };
  },
};

export default noClassNameStylePropsOutsideComponentGlobsRuleModule;
