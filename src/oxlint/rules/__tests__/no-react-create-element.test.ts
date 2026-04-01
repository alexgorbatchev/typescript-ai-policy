import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noReactCreateElementRuleModule from "../no-react-create-element.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noReactCreateElementRuleTester = new RuleTester();

noReactCreateElementRuleTester.run(
  "no-react-create-element rejects React element factory usage in regular code",
  noReactCreateElementRuleModule,
  {
    valid: [
      {
        code: `
          import React from 'react';

          export function SignalPanel() {
            return <section data-testid="SignalPanel" />;
          }
        `,
        filename: "SignalPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { useMemo } from 'react';

          export const BeaconCard = () => {
            return useMemo(() => <div />, []);
          };
        `,
        filename: "BeaconCard.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          const renderer = {
            createElement() {
              return null;
            },
          };

          renderer.createElement('div');
        `,
        filename: "renderer.js",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { createElement } from 'react';

          export function BrokenPanel() {
            return createElement('div', { 'data-testid': 'BrokenPanel' });
          }
        `,
        filename: "BrokenPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noImportedCreateElement",
          },
        ],
        output: null,
      },
      {
        code: `
          import { createElement as buildElement } from 'react';

          export const BrokenAlias = () => {
            return buildElement('div', { 'data-testid': 'BrokenAlias' });
          };
        `,
        filename: "BrokenAlias.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noImportedCreateElement",
          },
        ],
        output: null,
      },
      {
        code: `
          export function BrokenFactory() {
            return React.createElement('div', { 'data-testid': 'BrokenFactory' });
          }
        `,
        filename: "BrokenFactory.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noReactCreateElement",
          },
        ],
        output: null,
      },
    ],
  },
);
