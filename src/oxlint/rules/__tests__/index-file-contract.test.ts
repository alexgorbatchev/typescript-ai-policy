import { afterAll, describe, it } from "bun:test";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import indexFileContractRuleModule from "../index-file-contract.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const indexFileContractRuleTester = new RuleTester();

indexFileContractRuleTester.run(
  "index-file-contract enforces pure re-export index barrels",
  indexFileContractRuleModule,
  {
    valid: [
      {
        code: `
        export { createRule } from './createRule';
        export { default as indexFileContractRule } from './index-file-contract';
        export type { RuleConfig } from './types';
      `,
        filename: "src/oxlint/rules/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
        export * from './helpers';
        export type * from './types';
      `,
        filename: "src/shared/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
        export function createRule() {
          return {};
        }
      `,
        filename: "src/oxlint/rules/createRule.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
        import './register';
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexStatement",
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        const CURSOR_FALLBACK_MODEL_IDS = ["auto"];
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexStatement",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        function createRule() {
          return {};
        }
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexStatement",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export const createRule = () => ({ ok: true });
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexExport",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export type RuleConfig = { isEnabled: boolean };
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexExport",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export { createRule };
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexExport",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export default function createRule() {
          return {};
        }
      `,
        filename: "src/oxlint/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexExport",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.ts",
              renameSuffix: "",
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export { createRule } from './createRule';
      `,
        filename: "src/oxlint/index.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexTsxFilename",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
          },
        ],
        output: null,
      },
      {
        code: `import type { RuleConfig } from './types';
export { createRule } from './createRule';`,
        filename: "src/oxlint/index.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            column: 1,
            endColumn: 43,
            endLine: 1,
            line: 1,
            messageId: "unexpectedIndexTsxFilename",
            type: AST_NODE_TYPES.ImportDeclaration,
          },
          {
            column: 1,
            endColumn: 43,
            endLine: 1,
            line: 1,
            messageId: "unexpectedIndexStatement",
            type: AST_NODE_TYPES.ImportDeclaration,
            data: {
              barrelBaseName: "index.tsx",
              renameSuffix: ' Then rename this file to "index.ts".',
            },
          },
        ],
        output: null,
      },
      {
        code: `
        export function createRule() {
          return <div />;
        }
      `,
        filename: "src/oxlint/index.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedIndexTsxFilename",
          },
          {
            messageId: "unexpectedIndexExport",
            type: AST_NODE_TYPES.Identifier,
            data: {
              barrelBaseName: "index.tsx",
              renameSuffix: ' Then rename this file to "index.ts".',
            },
          },
        ],
        output: null,
      },
    ],
  },
);
