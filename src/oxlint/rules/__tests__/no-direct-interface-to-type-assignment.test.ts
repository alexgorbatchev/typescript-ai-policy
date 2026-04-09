import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import ruleModule from "../no-direct-interface-to-type-assignment.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run("no-direct-interface-to-type-assignment", ruleModule, {
  valid: [
    {
      code: `type EndpointVerification = Omit<IEndpointVerification, "id">;`,
      filename: "types.ts",
      languageOptions: languageOpts,
    },
    {
      code: `type EndpointVerification = { value: string };`,
      filename: "types.ts",
      languageOptions: languageOpts,
    },
    {
      code: `type RegularType = AnotherType;`,
      filename: "types.ts",
      languageOptions: languageOpts,
    },
    {
      code: `export type RouteParams = IRouteParams["id"];`,
      filename: "types.ts",
      languageOptions: languageOpts,
    },
  ],
  invalid: [
    {
      code: `type EndpointVerification = IEndpointVerification;`,
      filename: "types.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedDirectInterfaceAssignment",
        },
      ],
      output: null,
    },
    {
      code: `export type EndpointVerification = IEndpointVerification;`,
      filename: "types.ts",
      languageOptions: languageOpts,
      errors: [
        {
          messageId: "unexpectedDirectInterfaceAssignment",
        },
      ],
      output: null,
    },
  ],
});
