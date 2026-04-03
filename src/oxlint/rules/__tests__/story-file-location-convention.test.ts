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

const validDirectStoryComponentDirectoryPath = createComponentDirectoryPath("valid-direct-story");
mkdirSync(join(validDirectStoryComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(
  join(validDirectStoryComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);

const validNestedStoryComponentDirectoryPath = createComponentDirectoryPath("valid-nested-story");
mkdirSync(join(validNestedStoryComponentDirectoryPath, "stories", "catalog"), { recursive: true });
writeFileSync(
  join(validNestedStoryComponentDirectoryPath, "account-panel.tsx"),
  "export function AccountPanel() { return <section />; }\n",
);

const missingStoriesDirectoryComponentDirectoryPath = createComponentDirectoryPath("missing-stories-directory");
writeFileSync(
  join(missingStoriesDirectoryComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);

const missingSiblingComponentDirectoryPath = createComponentDirectoryPath("missing-sibling-component");
mkdirSync(join(missingSiblingComponentDirectoryPath, "stories", "catalog"), { recursive: true });

const ruleTester = new RuleTester();

ruleTester.run(
  "story-file-location-convention requires story files under stories and mapped to a sibling component basename",
  storyFileLocationConventionRuleModule,
  {
    valid: [
      {
        code: `export default {};`,
        filename: join(validDirectStoryComponentDirectoryPath, "stories", "Button.stories.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export default {};`,
        filename: join(validNestedStoryComponentDirectoryPath, "stories", "catalog", "account-panel.stories.tsx"),
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
          },
        ],
        output: null,
      },
      {
        code: `export default {};`,
        filename: join(missingSiblingComponentDirectoryPath, "stories", "catalog", "Missing.stories.tsx"),
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
