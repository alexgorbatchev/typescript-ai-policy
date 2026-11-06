import { isInComponentOwnershipDirectory, isIntrinsicElementName, isStoryOrTestTsxFile } from "./helpers.ts";
import { isRuntimeComponentOwnershipFile } from "./componentOwnership/componentOwnershipRole.ts";
import { createNativeRenderMatcher } from "./nativeStyling/createNativeRenderMatcher.ts";
import type { RuleModule } from "./types.ts";

const noClassNameStylePropsOutsideComponentGlobsRuleModule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Allow styling on raw DOM and verified native primitives while banning product-component overrides",
      guidance:
        "Keep raw DOM styling in canonical component areas, stories, and tests. Use `className` and `style` on verified native @base-ui/react 1.9.0 primitives only in runtime component ownership files. Resolve native imports through their actual lexical bindings and installed public package entries; unsupported versions and exports fail closed. Native render chains must statically reach raw DOM or another verified native primitive, including const element aliases. Do not style product components, unresolved render callbacks, or props-supplied replacements. Raw DOM styling in stories and tests remains allowed.",
    },
    schema: [],
    messages: {
      noClassNameOrStylePropOutsideComponentDirectory:
        "Move styling into a component ownership file. Expose necessary variants instead of passing styling props here.",
      noClassNameOrStylePropOnCustomComponent:
        "Use layout components or variant props instead of passing className or style.",
    },
  },
  create(context) {
    const isNativeRender = createNativeRenderMatcher(context);
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (node.name.name !== "className" && node.name.name !== "style") {
          return;
        }

        const openingElement = node.parent;
        if (!openingElement || openingElement.type !== "JSXOpeningElement") {
          return;
        }

        const isCustomComponent = !isIntrinsicElementName(openingElement.name);

        if (isCustomComponent && !isNativeRender(openingElement)) {
          context.report({
            node: node.name,
            messageId: "noClassNameOrStylePropOnCustomComponent",
          });
          return;
        }

        if (!isCustomComponent && isStoryOrTestTsxFile(context.filename)) {
          return;
        }

        const isOwnershipFile = isCustomComponent
          ? isRuntimeComponentOwnershipFile(context.filename)
          : isInComponentOwnershipDirectory(context.filename);
        if (isOwnershipFile) {
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
