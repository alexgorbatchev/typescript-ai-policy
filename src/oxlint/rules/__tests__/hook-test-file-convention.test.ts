import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import hookTestFileConventionRuleModule from "../hook-test-file-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "hook-test-file-convention-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createHooksDirectoryPath(name: string): string {
  const directoryPath = join(tempRootDirectoryPath, name, "hooks");
  mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

const validTsHooksDirectoryPath = createHooksDirectoryPath("valid-ts");
mkdirSync(join(validTsHooksDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validTsHooksDirectoryPath, "__tests__", "useAccount.test.ts"), "export {};\n");

const validTsxHooksDirectoryPath = createHooksDirectoryPath("valid-tsx");
mkdirSync(join(validTsxHooksDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validTsxHooksDirectoryPath, "__tests__", "use-account.test.tsx"), "export {};\n");

const missingTestHooksDirectoryPath = createHooksDirectoryPath("missing-test");
mkdirSync(join(missingTestHooksDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(missingTestHooksDirectoryPath, "__tests__", "useOther.test.ts"), "export {};\n");

const wrongExtensionHooksDirectoryPath = createHooksDirectoryPath("wrong-extension");
mkdirSync(join(wrongExtensionHooksDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(wrongExtensionHooksDirectoryPath, "__tests__", "useAccount.test.tsx"), "export {};\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "hook-test-file-convention requires colocated hook tests with matching basenames and source extensions",
  hookTestFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: join(validTsHooksDirectoryPath, "useAccount.ts"),
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return <div />; }`,
        filename: join(validTsxHooksDirectoryPath, "use-account.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: join(missingTestHooksDirectoryPath, "useAccount.ts"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingHookTestFile",
            data: {
              requiredTestFilePath: join(missingTestHooksDirectoryPath, "__tests__", "useAccount.test.ts"),
            },
          },
        ],
        output: null,
      },
      {
        code: `export function useAccount() { return null; }`,
        filename: join(wrongExtensionHooksDirectoryPath, "useAccount.ts"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingHookTestFile",
            data: {
              requiredTestFilePath: join(wrongExtensionHooksDirectoryPath, "__tests__", "useAccount.test.ts"),
            },
          },
        ],
        output: null,
      },
    ],
  },
);
