import type { AstProgram, RuleModule } from "./types.ts";
import { readProgramReportNode } from "./helpers.ts";
import { readComponentOwnershipRole } from "./componentOwnership/componentOwnershipRole.ts";
import { StoryOwnershipIndex } from "./componentOwnership/StoryOwnershipIndex.ts";

const storyFileLocationConventionRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Require Storybook files under "stories/" to resolve their typed meta and component property to the same component ownership binding',
      guidance:
        "Keep stories in a stories directory within the component's owning area and package. Match the source basename and resolve typed meta and its effective component property to the same exported binding; catalog groups do not determine ownership.",
    },
    schema: [],
    messages: {
      invalidStoryFileLocation:
        'Place story files under a "stories/" directory in the owning component area and package.',
      missingSiblingComponent:
        "Bind typed meta and its component property to the same runtime component in this ownership area. Match the story basename to that component's source file.",
    },
  },
  create(context) {
    const ownership = new StoryOwnershipIndex(context.filename, context.sourceCode.text);
    return {
      Program(node: AstProgram) {
        const reportNode = readProgramReportNode(node);
        const role = readComponentOwnershipRole(context.filename);
        if (!role?.rolePath.slice(0, -1).includes("stories")) {
          context.report({
            node: reportNode,
            messageId: "invalidStoryFileLocation",
          });
          return;
        }

        if (ownership.readOwner(context.filename)) {
          return;
        }

        context.report({
          node: reportNode,
          messageId: "missingSiblingComponent",
        });
      },
    };
  },
};

export default storyFileLocationConventionRule;
