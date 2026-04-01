import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import storyFileLocationConventionRuleModule from "../story-file-location-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "story-file-location-convention-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createComponentDirectoryPath(name: string): string {
  const directoryPath = join(tempRootDirectoryPath, name, "components");
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

const validPascalComponentDirectoryPath = createComponentDirectoryPath("valid-pascal");
mkdirSync(join(validPascalComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(
  join(validPascalComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);

const validKebabComponentDirectoryPath = createComponentDirectoryPath("valid-kebab");
mkdirSync(join(validKebabComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(
  join(validKebabComponentDirectoryPath, "account-panel.tsx"),
  "export function AccountPanel() { return <section />; }\n",
);

const missingStoriesDirectoryComponentDirectoryPath = createComponentDirectoryPath("missing-stories-directory");
writeFileSync(
  join(missingStoriesDirectoryComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);

const nestedStoriesDirectoryComponentDirectoryPath = createComponentDirectoryPath("nested-stories-directory");
mkdirSync(join(nestedStoriesDirectoryComponentDirectoryPath, "stories", "internal"), { recursive: true });
writeFileSync(
  join(nestedStoriesDirectoryComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);

const missingSiblingComponentDirectoryPath = createComponentDirectoryPath("missing-sibling-component");
mkdirSync(join(missingSiblingComponentDirectoryPath, "stories"), { recursive: true });

const ruleTester = new RuleTester();

ruleTester.run(
  "story-file-location-convention requires colocated stories directory files",
  storyFileLocationConventionRuleModule,
  {
    valid: [
      {
        code: `export default {};`,
        filename: join(validPascalComponentDirectoryPath, "stories", "Button.stories.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export default {};`,
        filename: join(validKebabComponentDirectoryPath, "stories", "account-panel.stories.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export default {};`,
        filename: join(missingStoriesDirectoryComponentDirectoryPath, "Button.stories.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidStoryFileLocation",
            data: {
              expectedStoryFileName: "Button.stories.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export default {};`,
        filename: join(nestedStoriesDirectoryComponentDirectoryPath, "stories", "internal", "Button.stories.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidStoryFileLocation",
            data: {
              expectedStoryFileName: "Button.stories.tsx",
            },
          },
        ],
        output: null,
      },
      {
        code: `export default {};`,
        filename: join(missingSiblingComponentDirectoryPath, "stories", "Missing.stories.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingSiblingComponent",
            data: {
              requiredComponentFilePath: join(missingSiblingComponentDirectoryPath, "Missing.tsx"),
            },
          },
        ],
        output: null,
      },
    ],
  },
);
