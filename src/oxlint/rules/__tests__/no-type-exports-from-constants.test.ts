import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noTypeExportsFromConstantsRuleModule from "../no-type-exports-from-constants.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noTypeExportsFromConstantsRuleTester = new RuleTester();

noTypeExportsFromConstantsRuleTester.run(
  "no-type-exports-from-constants bans type exports from constants files",
  noTypeExportsFromConstantsRuleModule,
  {
    valid: [
      {
        code: `
          export const USER_STATUS = { active: "active" };
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export { USER_STATUS } from "./userStatusConstants";
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export type UserStatus = "active" | "disabled";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export type UserStatus = "active" | "disabled";
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExport",
            data: {
              name: "UserStatus",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export interface IUserStatusMap {
            active: string;
          }
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExport",
            data: {
              name: "IUserStatusMap",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export type { UserStatus } from "./types";
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExport",
            data: {
              name: "UserStatus",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export { type UserStatus, USER_STATUS } from "./shared";
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExport",
            data: {
              name: "UserStatus",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export type * from "./types";
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExportAll",
            data: {
              exportPath: "./types",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export declare const USER_STATUS: string;
        `,
        filename: "src/accounts/constants.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeExport",
            data: {
              name: "USER_STATUS",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
