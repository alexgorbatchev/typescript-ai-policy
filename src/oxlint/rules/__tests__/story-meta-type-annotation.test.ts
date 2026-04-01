import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storyMetaTypeAnnotationRuleModule from "../story-meta-type-annotation.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("story-meta-type-annotation enforces typed meta bindings", storyMetaTypeAnnotationRuleModule, {
  valid: [
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
    },
  ],
  invalid: [
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { Button } from '../Button';

        const meta = {
          component: Button,
        } as Meta<typeof Button>;

        export default meta;
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingMetaTypeAnnotation",
        },
        {
          messageId: "unexpectedMetaTypeAssertion",
        },
      ],
      output: null,
    },
    {
      code: `
        import { Button } from '../Button';

        const meta = {
          component: Button,
        };

        export default meta;
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingMetaTypeAnnotation",
        },
      ],
      output: null,
    },
    {
      code: `
        import { Button } from '../Button';

        export default {
          component: Button,
        };
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "invalidMetaBinding",
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Story } from '@storybook/react';
        import { Button } from '../Button';

        const meta: Story = {
          component: Button,
        };

        export default meta;
      `,
      filename: "src/accounts/components/stories/Button.stories.tsx",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingMetaTypeAnnotation",
        },
      ],
      output: null,
    },
  ],
});
