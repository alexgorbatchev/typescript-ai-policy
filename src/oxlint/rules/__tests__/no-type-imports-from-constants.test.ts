import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noTypeImportsFromConstantsRuleModule from "../no-type-imports-from-constants.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noTypeImportsFromConstantsRuleTester = new RuleTester();

noTypeImportsFromConstantsRuleTester.run(
  "no-type-imports-from-constants bans type imports from constants modules",
  noTypeImportsFromConstantsRuleModule,
  {
    valid: [
      {
        code: `
          import { USER_STATUS } from "./constants";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { UserStatus } from "./types";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { USER_STATUS } from "../shared/constants.ts";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type UserStatus = import("./types").UserStatus;
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import type { UserStatus } from "./constants";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeImport",
            data: {
              name: "UserStatus",
              importPath: "./constants",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { type UserStatus, USER_STATUS } from "./constants";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeImport",
            data: {
              name: "UserStatus",
              importPath: "./constants",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import type UserStatusMap from "../shared/constants.ts";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeImport",
            data: {
              name: "UserStatusMap",
              importPath: "../shared/constants.ts",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import type * as userStatusTypes from "@/accounts/constants";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeImport",
            data: {
              name: "userStatusTypes",
              importPath: "@/accounts/constants",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          type UserStatus = import("./constants").UserStatus;
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeImport",
            data: {
              importPath: "./constants",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          type UserStatusModule = typeof import("./constants");
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeImport",
            data: {
              importPath: "./constants",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
