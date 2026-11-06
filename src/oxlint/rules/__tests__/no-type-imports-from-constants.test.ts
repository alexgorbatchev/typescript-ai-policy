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
          import type { USER_STATUS } from "./constants.ts";
          type UserStatus = (typeof USER_STATUS)[number];
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { type USER_STATUS, CURRENT_STATUS } from "./constants.ts";
          type UserStatus = keyof typeof USER_STATUS;
          console.log(CURRENT_STATUS);
        `,
        filename: "src/accounts/readStatus.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { USER_STATUS as status } from "./constants.ts";
          type Status = typeof status;
          type StatusKeys = keyof typeof status;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { settings } from "./constants.ts";
          type Status = typeof settings.account.status;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import type { USER_STATUS } from "./constants.ts";
          type UserStatus = typeof USER_STATUS;
          function readStatus(USER_STATUS: string) {
            return USER_STATUS;
          }
        `,
        filename: "src/accounts/readStatus.ts",
        languageOptions: languageOpts,
      },
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
          import type { USER_STATUS } from "./constants.ts";
          function readStatus(USER_STATUS: string) {
            type LocalStatus = typeof USER_STATUS;
            const status: LocalStatus = USER_STATUS;
            return status;
          }
        `,
        filename: "src/accounts/readStatus.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type { Status } from "./constants.ts";
          type Constructor = typeof Status;
          type Instance = Status;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type { USER_STATUS } from "./constants.ts";
          type Status = typeof USER_STATUS;
          export type { USER_STATUS };
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type Status from "./constants.ts";
          type UserStatus = typeof Status;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type * as constants from "./constants.ts";
          type UserStatus = typeof constants.USER_STATUS;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type { UserStatus } from "./constants.ts";
          declare function readStatus<T>(): T;
          type ReadStatus = typeof readStatus<UserStatus>;
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedTypeImport" }],
        output: null,
      },
      {
        code: `
          import type { UserStatus } from "./constants";
        `,
        filename: "src/accounts/index.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedTypeImport",
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
          },
        ],
        output: null,
      },
    ],
  },
);
