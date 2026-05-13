import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storyMetaTypeAnnotationRuleModule from "../story-meta-type-annotation.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const EXPECTED_STORY_META_TYPE_ANNOTATION_GUIDANCE =
  "Bind Storybook meta to a typed top-level const and default-export that identifier. Do not type story meta with object assertions.";

const EXPECTED_STORY_META_TYPE_ANNOTATION_MESSAGES = {
  invalidMetaBinding:
    "Bind Storybook meta to a top-level const and default-export that identifier. Use a typed meta binding instead of exporting the object inline.",
  missingMetaTypeAnnotation:
    "Annotate the meta binding as `Meta<typeof Component>`. Do not rely on inference for story meta.",
  unexpectedMetaTypeAssertion:
    "Replace this meta assertion with a const type annotation. Keep story meta typed on the binding, not on the object expression.",
};

it("uses the approved story meta guidance and messages", () => {
  expect(storyMetaTypeAnnotationRuleModule.meta.docs?.guidance).toBe(EXPECTED_STORY_META_TYPE_ANNOTATION_GUIDANCE);
  expect(storyMetaTypeAnnotationRuleModule.meta.messages).toEqual(EXPECTED_STORY_META_TYPE_ANNOTATION_MESSAGES);
});

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
