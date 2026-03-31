import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import testIdNamingConventionRuleModule from "../testid-naming-convention.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const testIdNamingConventionRuleTester = new RuleTester();

testIdNamingConventionRuleTester.run(
  "testid-naming-convention enforces component-scoped test id prefixes",
  testIdNamingConventionRuleModule,
  {
    valid: [
      {
        code: `
        const SignalPanel = () => {
          return <div data-testid="SignalPanel">Hello</div>;
        };
      `,
        filename: "SignalPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
        const SignalPanel = () => {
          return <div data-testid="SignalPanel--element">Hello</div>;
        };
      `,
        filename: "SignalPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
        function AlertBeacon() {
          return <span testId="AlertBeacon--span">World</span>;
        }
      `,
        filename: "AlertBeacon.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
        export default function () {
          return <button data-testid="MuteSwitch--button">Click me</button>;
        }
      `,
        filename: "MuteSwitch.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
        const SignalPanel = () => {
          return <div data-testid="WrongName--element">Hello</div>;
        };
      `,
        filename: "SignalPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "WrongName--element",
              componentName: "SignalPanel",
            },
          },
        ],
        output: `
        const SignalPanel = () => {
          return <div data-testid="SignalPanel--element">Hello</div>;
        };
      `,
      },
      {
        code: `
        const SignalPanel = () => {
          return <div data-testid="element">Hello</div>;
        };
      `,
        filename: "SignalPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "element",
              componentName: "SignalPanel",
            },
          },
        ],
        output: `
        const SignalPanel = () => {
          return <div data-testid="SignalPanel--element">Hello</div>;
        };
      `,
      },
      {
        code: `
        function AlertBeacon() {
          return <span testId="WrongName--span">World</span>;
        }
      `,
        filename: "AlertBeacon.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "testId",
              candidate: "WrongName--span",
              componentName: "AlertBeacon",
            },
          },
        ],
        output: `
        function AlertBeacon() {
          return <span testId="AlertBeacon--span">World</span>;
        }
      `,
      },
      {
        code: `
        function AlertBeacon() {
          return <span testId="span">World</span>;
        }
      `,
        filename: "AlertBeacon.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "testId",
              candidate: "span",
              componentName: "AlertBeacon",
            },
          },
        ],
        output: `
        function AlertBeacon() {
          return <span testId="AlertBeacon--span">World</span>;
        }
      `,
      },
      {
        code: `
        export default function () {
          return <button data-testid="WrongName--button">Click me</button>;
        }
      `,
        filename: "MuteSwitch.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "WrongName--button",
              componentName: "MuteSwitch",
            },
          },
        ],
        output: `
        export default function () {
          return <button data-testid="MuteSwitch--button">Click me</button>;
        }
      `,
      },
      {
        code: `
        export default function () {
          return <button data-testid="button">Click me</button>;
        }
      `,
        filename: "MuteSwitch.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "button",
              componentName: "MuteSwitch",
            },
          },
        ],
        output: `
        export default function () {
          return <button data-testid="MuteSwitch--button">Click me</button>;
        }
      `,
      },
      {
        code: `
        const WorkspaceFrame = () => {
          const InnerBadge = () => {
            return <div data-testid="InnerBadge--element">Hello</div>;
          };
          return <InnerBadge />;
        };
      `,
        filename: "WorkspaceFrame.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "InnerBadge--element",
              componentName: "WorkspaceFrame",
            },
          },
        ],
        output: `
        const WorkspaceFrame = () => {
          const InnerBadge = () => {
            return <div data-testid="WorkspaceFrame--element">Hello</div>;
          };
          return <InnerBadge />;
        };
      `,
      },
      {
        code: `
        const WorkspaceFrame = () => {
          const InnerBadge = () => {
            return <div data-testid="element">Hello</div>;
          };
          return <InnerBadge />;
        };
      `,
        filename: "WorkspaceFrame.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidTestId",
            data: {
              attributeName: "data-testid",
              candidate: "element",
              componentName: "WorkspaceFrame",
            },
          },
        ],
        output: `
        const WorkspaceFrame = () => {
          const InnerBadge = () => {
            return <div data-testid="WorkspaceFrame--element">Hello</div>;
          };
          return <InnerBadge />;
        };
      `,
      },
    ],
  },
);
