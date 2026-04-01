import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noInlineTypeExpressionsRuleModule from "../no-inline-type-expressions.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noInlineTypeExpressionsRuleTester = new RuleTester();

noInlineTypeExpressionsRuleTester.run(
  "no-inline-type-expressions requires use-site type annotations to use named declarations or inference",
  noInlineTypeExpressionsRuleModule,
  {
    valid: [
      {
        code: `
          interface IUserRef {
            id: string;
          }

          const userRef: IUserRef = { id: "user-1" };
        `,
        filename: "src/domain/users/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type SortableEntry = { score: number };

          const sorted = items.sort((left: SortableEntry, right: SortableEntry) => right.score - left.score);
        `,
        filename: "src/domain/users/sortUsers.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const sorted = items.sort((left, right) => right.score - left.score);
        `,
        filename: "src/domain/users/sortUsers.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          type UserField = "id" | "name";
          type UserSummary = Pick<User, UserField>;
          type NullableUser = User | null;
          type UserLoader = (value: string) => NullableUser;
          type UserTuple = readonly [id: string, name: string];

          const userSummary: UserSummary = sourceUserSummary;

          export function createUserLoader(loader: UserLoader): NullableUser {
            return loader("user-1");
          }
        `,
        filename: "src/domain/users/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function readUser(): User | null {
            return null;
          }

          export function readCachedUser(): User | undefined {
            return undefined;
          }

          export function readOptionalUser(): User | null | undefined {
            return undefined;
          }
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const maybeUserPromise: Promise<User | null> = readUserPromise();
        `,
        filename: "src/domain/users/readUserPromise.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          interface IUserConfig {
            loader: (value: string) => Promise<User | null>;
            fields: Pick<User, "id" | "name">;
            nested: { id: string; metadata: { score: number } };
          }

          const config = value satisfies IUserConfig;
        `,
        filename: "src/domain/users/types.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          interface IHasId {
            id: string;
          }

          function indexById<T extends IHasId>(items: T[]): Map<string, T> {
            return new Map(items.map((item) => [item.id, item]));
          }
        `,
        filename: "src/domain/users/indexById.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          const userRef: { id: string } = { id: "user-1" };
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "object-literal type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const pairs: Array<[string, number]> = Object.entries(counts);
        `,
        filename: "src/domain/users/readPairs.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "tuple type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const transform: (value: string) => number = (value) => value.length;
        `,
        filename: "src/domain/users/transform.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "function-signature type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function readUser(): User | Admin | null {
            return null;
          }
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "union type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const auditedUser: User & Audited = sourceUser;
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "intersection type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const config = value satisfies { id: string; metadata: { score: number } };
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "object-literal type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const maybeUser: { id: string } | null = sourceUser;
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "object-literal type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
            return new Map(items.map((item) => [item.id, item]));
          }
        `,
        filename: "src/domain/users/indexById.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "object-literal type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const readValue: { [key: string]: User } = {};
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "object-literal type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const selectedUsers: { [Key in UserField]: User } = sourceUsers;
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "mapped type expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          const resolver: T extends string ? User : null = sourceResolver;
        `,
        filename: "src/domain/users/readUser.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedInlineTypeExpression",
            data: {
              kind: "conditional type expression",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
