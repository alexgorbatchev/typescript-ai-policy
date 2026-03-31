import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import componentTestFileConventionRuleModule from "../component-test-file-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "component-test-file-convention-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createComponentDirectoryPath(name: string): string {
  const directoryPath = join(tempRootDirectoryPath, name, "components");
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

const validPascalComponentDirectoryPath = createComponentDirectoryPath("valid-pascal");
mkdirSync(join(validPascalComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validPascalComponentDirectoryPath, "__tests__", "Button.test.tsx"), "export {};\n");

const validKebabComponentDirectoryPath = createComponentDirectoryPath("valid-kebab");
mkdirSync(join(validKebabComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validKebabComponentDirectoryPath, "__tests__", "account-panel.test.tsx"), "export {};\n");

const missingTestComponentDirectoryPath = createComponentDirectoryPath("missing-test");
mkdirSync(join(missingTestComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(missingTestComponentDirectoryPath, "__tests__", "Other.test.tsx"), "export {};\n");

const wrongExtensionComponentDirectoryPath = createComponentDirectoryPath("wrong-extension");
mkdirSync(join(wrongExtensionComponentDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(wrongExtensionComponentDirectoryPath, "__tests__", "Button.test.ts"), "export {};\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "component-test-file-convention requires colocated component tests with matching basenames and tsx extension",
  componentTestFileConventionRuleModule,
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
        filename: join(missingTestComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingComponentTestFile",
            data: {
              requiredTestFilePath: join(missingTestComponentDirectoryPath, "__tests__", "Button.test.tsx"),
            },
          },
        ],
        output: null,
      },
      {
        code: `export function Button() { return <button />; }`,
        filename: join(wrongExtensionComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingComponentTestFile",
            data: {
              requiredTestFilePath: join(wrongExtensionComponentDirectoryPath, "__tests__", "Button.test.tsx"),
            },
          },
        ],
        output: null,
      },
    ],
  },
);
