import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storyTitleConventionRuleModule from "../story-title-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "story-title-convention-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createPackageRootDirectoryPath(name: string): string {
  const directoryPath = join(tempRootDirectoryPath, name);
  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(join(directoryPath, "package.json"), "{}\n");
  return directoryPath;
}

const basicPackageRootDirectoryPath = createPackageRootDirectoryPath("basic-package");

const workspaceRootDirectoryPath = createPackageRootDirectoryPath("workspace-root");
const nestedPackageRootDirectoryPath = join(workspaceRootDirectoryPath, "packages", "ui");
mkdirSync(nestedPackageRootDirectoryPath, { recursive: true });
writeFileSync(join(nestedPackageRootDirectoryPath, "package.json"), "{}\n");

const ruleTester = new RuleTester();

ruleTester.run("story-title-convention enforces package-relative Storybook titles", storyTitleConventionRuleModule, {
  valid: [
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { AccountPanel } from '../AccountPanel';

        const meta: Meta<typeof AccountPanel> = {
          component: AccountPanel,
          title: 'accounts/AccountPanel',
        };

        export default meta;
      `,
      filename: join(basicPackageRootDirectoryPath, "src", "accounts", "stories", "AccountPanel.stories.tsx"),
      languageOptions: languageOpts,
    },
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { TextField } from '../TextField';

        const meta: Meta<typeof TextField> = {
          component: TextField,
          title: 'forms/catalog/TextField',
        };

        export default meta;
      `,
      filename: join(nestedPackageRootDirectoryPath, "src", "forms", "stories", "catalog", "TextField.stories.tsx"),
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { AccountPanel } from '../AccountPanel';

        const meta: Meta<typeof AccountPanel> = {
          component: AccountPanel,
        };

        export default meta;
      `,
      filename: join(basicPackageRootDirectoryPath, "src", "accounts", "stories", "AccountPanel.stories.tsx"),
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "missingStoryTitle",
          data: {
            expectedTitle: "accounts/AccountPanel",
          },
        },
      ],
      output: null,
    },
    {
      code: `
        import type { Meta } from '@storybook/react';
        import { TextField } from '../TextField';

        const meta: Meta<typeof TextField> = {
          component: TextField,
          title: 'workspace-root/forms/catalog/TextField',
        };

        export default meta;
      `,
      filename: join(nestedPackageRootDirectoryPath, "src", "forms", "stories", "catalog", "TextField.stories.tsx"),
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedStoryTitle",
          data: {
            expectedTitle: "forms/catalog/TextField",
          },
        },
      ],
      output: null,
    },
  ],
});
