import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
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

const validPascalComponentDirectoryPath = createComponentDirectoryPath("valid-pascal");
mkdirSync(join(validPascalComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(join(validPascalComponentDirectoryPath, "stories", "Button.stories.tsx"), "export {}\n");

const validKebabComponentDirectoryPath = createComponentDirectoryPath("valid-kebab");
mkdirSync(join(validKebabComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(join(validKebabComponentDirectoryPath, "stories", "account-panel.stories.tsx"), "export {}\n");

const missingStoryComponentDirectoryPath = createComponentDirectoryPath("missing-story");
mkdirSync(join(missingStoryComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(join(missingStoryComponentDirectoryPath, "stories", "Other.stories.tsx"), "export {}\n");

const legacyTsxTestComponentDirectoryPath = createComponentDirectoryPath("legacy-tsx-test");
mkdirSync(join(legacyTsxTestComponentDirectoryPath, "stories"), { recursive: true });
mkdirSync(join(legacyTsxTestComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(legacyTsxTestComponentDirectoryPath, "stories", "Button.stories.tsx"), "export {}\n");
writeFileSync(join(legacyTsxTestComponentDirectoryPath, "__tests__", "Button.test.tsx"), "export {}\n");

const legacyTsTestComponentDirectoryPath = createComponentDirectoryPath("legacy-ts-test");
mkdirSync(join(legacyTsTestComponentDirectoryPath, "stories"), { recursive: true });
mkdirSync(join(legacyTsTestComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(legacyTsTestComponentDirectoryPath, "stories", "Button.stories.tsx"), "export {}\n");
writeFileSync(join(legacyTsTestComponentDirectoryPath, "__tests__", "Button.test.ts"), "export {}\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "component-story-file-convention requires colocated component stories and bans basename-matched component tests",
  componentStoryFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function Button() { return <button />; }`,
        filename: join(validPascalComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: join(validKebabComponentDirectoryPath, "account-panel.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export function Button() { return <button />; }`,
        filename: join(missingStoryComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingComponentStoryFile",
            data: {
              requiredStoryFilePath: join(missingStoryComponentDirectoryPath, "stories", "Button.stories.tsx"),
            },
          },
        ],
        output: null,
      },
      {
        code: `export function Button() { return <button />; }`,
        filename: join(legacyTsxTestComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedComponentTestFile",
            data: {
              forbiddenTestFilePath: join(legacyTsxTestComponentDirectoryPath, "__tests__", "Button.test.tsx"),
            },
          },
        ],
        output: null,
      },
      {
        code: `export function Button() { return <button />; }`,
        filename: join(legacyTsTestComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedComponentTestFile",
            data: {
              forbiddenTestFilePath: join(legacyTsTestComponentDirectoryPath, "__tests__", "Button.test.ts"),
            },
          },
        ],
        output: null,
      },
    ],
  },
);
