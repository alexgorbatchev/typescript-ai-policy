import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import interfaceNamingConventionRuleModule from "../interface-naming-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const interfaceNamingConventionRuleTester = new RuleTester();

interfaceNamingConventionRuleTester.run(
  "interface-naming-convention enforces I-prefixed PascalCase names for repository-owned interfaces",
  interfaceNamingConventionRuleModule,
  {
    valid: [
      {
        code: `
          interface IUserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export declare interface IUserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/public-api.d.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          namespace Domain {
            export interface IUserProfile {
              id: string;
            }
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          declare global {
            interface Window {
              analytics: { track: () => void };
            }
          }
        `,
        filename: "src/accounts/globals.d.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          declare module "vite/client" {
            interface ImportMetaEnv {
              readonly VITE_API_URL: string;
            }
          }
        `,
        filename: "src/accounts/vite-env.d.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          declare namespace JSX {
            interface IntrinsicElements {
              div: {};
            }
          }
        `,
        filename: "src/accounts/jsx.d.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          declare interface Window {
            analytics: { track: () => void };
          }
        `,
        filename: "src/accounts/globals.d.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          interface UserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInterfaceName",
            data: {
              name: "UserProfile",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export interface IuserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInterfaceName",
            data: {
              name: "IuserProfile",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          namespace Domain {
            export interface UserProfile {
              id: string;
            }
          }
        `,
        filename: "src/accounts/types.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInterfaceName",
            data: {
              name: "UserProfile",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export declare interface UserProfile {
            id: string;
          }
        `,
        filename: "src/accounts/public-api.d.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInterfaceName",
            data: {
              name: "UserProfile",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
