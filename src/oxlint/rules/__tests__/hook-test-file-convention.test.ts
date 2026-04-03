import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import hookTestFileConventionRuleModule from "../hook-test-file-convention.ts";

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

const validDirectTestHooksDirectoryPath = createHooksDirectoryPath("valid-direct-test");
mkdirSync(join(validDirectTestHooksDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validDirectTestHooksDirectoryPath, "__tests__", "useAccount.test.ts"), "export {};\n");

const validNestedTestHooksDirectoryPath = createHooksDirectoryPath("valid-nested-test");
mkdirSync(join(validNestedTestHooksDirectoryPath, "__tests__", "integration"), { recursive: true });
writeFileSync(
  join(validNestedTestHooksDirectoryPath, "__tests__", "integration", "use-account.test.tsx"),
  "export {};\n",
);

const missingTestHooksDirectoryPath = createHooksDirectoryPath("missing-test");
mkdirSync(join(missingTestHooksDirectoryPath, "__tests__", "integration"), { recursive: true });
writeFileSync(join(missingTestHooksDirectoryPath, "__tests__", "integration", "useOther.test.ts"), "export {};\n");

const ruleTester = new RuleTester();

ruleTester.run(
  "hook-test-file-convention requires hook tests somewhere under a sibling __tests__ directory",
  hookTestFileConventionRuleModule,
  {
    valid: [
      {
        code: `export function useAccount() { return null; }`,
        filename: join(validDirectTestHooksDirectoryPath, "useAccount.ts"),
        languageOptions: languageOpts,
      },
      {
        code: `export function useAccount() { return <div />; }`,
        filename: join(validNestedTestHooksDirectoryPath, "use-account.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { useMemo } from "preact/hooks";

          export function useAccount() {
            return useMemo(() => null, []);
          }
        `,
        filename: join(missingTestHooksDirectoryPath, "useAccount.ts"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingHookTestFile",
            type: AST_NODE_TYPES.ImportDeclaration,
            data: {
              requiredTestFileName: "useAccount.test.ts",
              requiredTestsDirectoryPath: ".../missing-test/hooks/__tests__",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
