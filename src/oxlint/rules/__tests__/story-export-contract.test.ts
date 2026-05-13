import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import storyExportContractRuleModule from "../story-export-contract.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const EXPECTED_STORY_EXPORT_CONTRACT_GUIDANCE =
  "Keep story exports limited to the approved Storybook surface. Move helper bindings and support code out of story files.";

const EXPECTED_STORY_EXPORT_CONTRACT_MESSAGES = {
  invalidMultiStoryExportShape:
    "Export multiple stories directly from their declarations. Do not re-export local story bindings through an export list.",
  invalidSingleStoryExportShape:
    "Use the single-story export shape for single-story files. Export one `Default` binding and re-export it as the sibling component name.",
  missingStoryExport:
    "Export at least one story object after the default meta. Keep story files focused on the approved Storybook surface.",
  missingStoryPlay:
    "Add a `play` property to this story object. Use stories as the required interaction-test surface for the sibling component.",
  missingStoryTypeAnnotation: "Annotate this story binding as `: Story`. Do not rely on inference for story objects.",
  unexpectedStoryTypeAssertion:
    "Replace this story assertion with a const type annotation. Keep story types on the binding, not on the object expression.",
  unexportedStoryBinding:
    "Export this story binding. Story objects in story files must be part of the public Storybook surface.",
};

it("uses the approved story export guidance and messages", () => {
  expect(storyExportContractRuleModule.meta.docs?.guidance).toBe(EXPECTED_STORY_EXPORT_CONTRACT_GUIDANCE);
  expect(storyExportContractRuleModule.meta.messages).toEqual(EXPECTED_STORY_EXPORT_CONTRACT_MESSAGES);
});

ruleTester.run("story-export-contract enforces story export shapes and play functions", storyExportContractRuleModule, {
  valid: [
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        const Default: Story = {
          play: async () => {},
        };

        export { Default as Button };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
    },
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { AccountPanel } from '../AccountPanel';

        const meta: Meta<typeof AccountPanel> = {
          component: AccountPanel,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        export const Default: Story = {
          play: async () => {},
        };

        export const WithProps: Story = {
          args: { isReady: true },
          play: async () => {},
        };
      `,
      filename: "src/accounts/components/stories/AccountPanel.stories.tsx",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        export const Default: Story = {
          play: async () => {},
        };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "invalidSingleStoryExportShape",
          data: {
            componentName: "Button",
          },
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        const Default: Story = {};

        export { Default as Button };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingStoryPlay",
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        const Default = {} as Story;

        export { Default as Button };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingStoryTypeAnnotation",
        },
        {
          messageId: "unexpectedStoryTypeAssertion",
        },
        {
          messageId: "missingStoryPlay",
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;

        type Story = StoryObj<typeof meta>;

        const Default: Story = {
          play: async () => {},
        };

        const WithProps: Story = {
          play: async () => {},
        };

        export { Default, WithProps };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "invalidMultiStoryExportShape",
        },
        {
          messageId: "invalidMultiStoryExportShape",
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Meta<typeof Button> = {
          component: Button,
        };

        export default meta;
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingStoryExport",
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
      output: null,
    },
  ],
});
