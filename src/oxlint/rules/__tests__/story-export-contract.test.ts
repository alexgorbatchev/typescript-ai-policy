import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storyExportContractRuleModule from "../story-export-contract.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

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
        },
      ],
      output: null,
    },
  ],
});
