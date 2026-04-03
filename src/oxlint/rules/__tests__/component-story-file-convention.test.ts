import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import componentStoryFileConventionRuleModule from "../component-story-file-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "component-story-file-convention-"));

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
writeFileSync(join(validDirectStoryComponentDirectoryPath, "stories", "Button.stories.tsx"), "export {}\n");

const validNestedStoryComponentDirectoryPath = createComponentDirectoryPath("valid-nested-story");
mkdirSync(join(validNestedStoryComponentDirectoryPath, "stories", "catalog"), { recursive: true });
writeFileSync(
  join(validNestedStoryComponentDirectoryPath, "stories", "catalog", "account-panel.stories.tsx"),
  "export {}\n",
);

const validComponentTestsDirectoryPath = createComponentDirectoryPath("valid-component-tests");
mkdirSync(join(validComponentTestsDirectoryPath, "stories"), { recursive: true });
mkdirSync(join(validComponentTestsDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validComponentTestsDirectoryPath, "stories", "Badge.stories.tsx"), "export {}\n");
writeFileSync(join(validComponentTestsDirectoryPath, "__tests__", "Badge.test.tsx"), "export {}\n");

const missingStoryComponentDirectoryPath = createComponentDirectoryPath("missing-story");
mkdirSync(join(missingStoryComponentDirectoryPath, "stories", "variants"), { recursive: true });
writeFileSync(join(missingStoryComponentDirectoryPath, "stories", "variants", "Other.stories.tsx"), "export {}\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "component-story-file-convention requires component stories under a sibling stories directory",
  componentStoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function Button() { return <button />; }`,
        filename: join(validDirectStoryComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: join(validNestedStoryComponentDirectoryPath, "account-panel.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export function Badge() { return <div />; }`,
        filename: join(validComponentTestsDirectoryPath, "Badge.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { memo } from "react";

          export const Button = memo(function Button() {
            return <button />;
          });
        `,
        filename: join(missingStoryComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingComponentStoryFile",
            type: AST_NODE_TYPES.Identifier,
            data: {
              requiredStoriesDirectoryPath: ".../missing-story/components/stories",
              requiredStoryFileName: "Button.stories.tsx",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
