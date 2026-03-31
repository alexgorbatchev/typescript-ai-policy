import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import noModuleMockingRuleModule from "../no-module-mocking.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const noModuleMockingRuleTester = new RuleTester();

noModuleMockingRuleTester.run(
  "no-module-mocking rejects module mocks across common test interfaces",
  noModuleMockingRuleModule,
  {
    valid: [
      {
        code: `
          import { vi } from 'vitest';

          const pickAnswer = vi.fn(() => 42);

          pickAnswer();
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import { mock } from 'bun:test';

          const fetchUser = mock(async () => ({ id: 'user-1' }));

          fetchUser();
          mock.restore();
        `,
        filename: "src/widgets/__tests__/BeaconPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          import test from 'node:test';

          test('tracks method calls without mocking modules', (t) => {
            t.mock.method(console, 'log');
          });
        `,
        filename: "src/widgets/__tests__/OrbitPanel.test.ts",
        languageOptions: languageOpts,
      },
      {
        code: `
          const moduleRegistry = {
            mock: {
              method() {
                return undefined;
              },
            },
          };

          moduleRegistry.mock.method();
        `,
        filename: "src/testing/moduleRegistry.ts",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { jest } from '@jest/globals';

          jest.mock('../gateway');
        `,
        filename: "src/widgets/__tests__/SignalPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "jest.mock",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { jest } from '@jest/globals';

          jest.enableAutomock();
        `,
        filename: "src/widgets/__tests__/BeaconPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "jest.enableAutomock",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { vi } from 'vitest';

          vi.mock(import('./service.ts'), () => ({
            request: vi.fn(),
          }));
        `,
        filename: "src/widgets/__tests__/BeaconPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "vi.mock",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import { mock } from 'bun:test';

          mock.module('./api-client', () => ({
            fetchUser() {
              return Promise.resolve(null);
            },
          }));
        `,
        filename: "src/widgets/__tests__/OrbitPanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "mock.module",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import test from 'node:test';

          test('blocks node:test module mocks', (t) => {
            t.mock.module('node:readline', {
              namedExports: {
                cursorTo() {
                  return undefined;
                },
              },
            });
          });
        `,
        filename: "src/widgets/__tests__/PulsePanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "t.mock.module",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          import * as bunTest from 'bun:test';

          bunTest.vi.doMock('./client', () => ({
            request: bunTest.vi.fn(),
          }));
        `,
        filename: "src/widgets/__tests__/WavePanel.test.ts",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "noModuleMocking",
            data: {
              fullName: "bunTest.vi.doMock",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
