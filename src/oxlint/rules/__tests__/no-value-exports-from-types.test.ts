import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noValueExportsFromTypesRuleModule from "../no-value-exports-from-types.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noValueExportsFromTypesRuleTester = new RuleTester();

noValueExportsFromTypesRuleTester.run(
  "no-value-exports-from-types bans value exports from types files",
  noValueExportsFromTypesRuleModule,
  {
    valid: [
      {
        code: `
          export type UserStatus = "active" | "disabled";
          export interface IUserStatusMap {
            active: string;
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export type { UserStatus } from "./shared-types";
          export { type IUserStatusMap } from "./shared-types";
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const USER_STATUS = { active: "active" };
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export const USER_STATUS = { active: "active" };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedValueExport",
            data: {
              name: "USER_STATUS",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export default { active: "active" };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedDefaultExport",
          },
        ],
        output: null,
      },
      {
        code: `
          export { USER_STATUS } from "./constants";
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedValueExport",
            data: {
              name: "USER_STATUS",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export { type UserStatus, USER_STATUS } from "./shared";
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedValueExport",
            data: {
              name: "USER_STATUS",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export * from "./constants";
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedValueExportAll",
            data: {
              exportPath: "./constants",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export declare const USER_STATUS: string;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedValueExport",
            data: {
              name: "USER_STATUS",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const USER_STATUS = { active: "active" };
          export = USER_STATUS;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedExportAssignment",
          },
        ],
        output: null,
      },
    ],
  },
);
