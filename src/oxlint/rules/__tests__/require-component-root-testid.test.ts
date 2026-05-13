import { afterAll, describe, expect, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import requireComponentRootTestIdRuleModule from "../require-component-root-testid.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const requireComponentRootTestIdRuleTester = new RuleTester();

const EXPECTED_COMPONENT_ROOT_TEST_ID_GUIDANCE =
  "Put a `data-testid` on the root element returned by every ownership component. Use the component name as that root id.";

const EXPECTED_COMPONENT_ROOT_TEST_ID_MESSAGES = {
  exportedFragmentRoot:
    "Return a DOM element as the exported component root. Do not use a fragment as the root render surface.",
  exportedOtherRoot: "Render a DOM element as the exported component root. Do not return a non-DOM root shape here.",
  invalidChildTestId:
    'Rename this child test id to the "{{ componentName }}--thing" form. Keep child ids namespaced under the owning component root id.',
  invalidLocalRootTestId:
    "Rename this root test id to match the local component name exactly. Keep local component roots aligned with their component name.",
  missingExportedRootTestId:
    "Add the component root test id to the exported root element. Use the component name as the root id.",
};

it("uses the approved component root test id guidance and messages", () => {
  expect(requireComponentRootTestIdRuleModule.meta.docs?.guidance).toBe(EXPECTED_COMPONENT_ROOT_TEST_ID_GUIDANCE);
  expect(requireComponentRootTestIdRuleModule.meta.messages).toEqual(EXPECTED_COMPONENT_ROOT_TEST_ID_MESSAGES);
});

requireComponentRootTestIdRuleTester.run(
  "require-component-root-testid enforces exported root and child test id contracts",
  requireComponentRootTestIdRuleModule,
  {
    valid: [
      {
        code: `
          export function SurfacePanel() {
            return (
              <section data-testid='SurfacePanel'>
                <div data-testid='SurfacePanel--content'>Ready</div>
              </section>
            );
          }
        `,
        filename: "SurfacePanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function MaybeSurface(props) {
            return props.isVisible ? <section data-testid='MaybeSurface' /> : null;
          }
        `,
        filename: "MaybeSurface.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function GateBadge(props) {
            return props.isVisible && <span testId='GateBadge' />;
          }
        `,
        filename: "GateBadge.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export class StatusFrame extends React.Component {
            render() {
              return (
                <section data-testid='StatusFrame'>
                  <div testId='StatusFrame--body'>Ready</div>
                </section>
              );
            }
          }
        `,
        filename: "StatusFrame.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export default memo(function WrappedPanel() {
            return (
              <section data-testid='WrappedPanel'>
                <div data-testid={\`WrappedPanel--body\`}>Ready</div>
              </section>
            );
          });
        `,
        filename: "WrappedPanel.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          function UntaggedHelper() {
            return <div>Ready</div>;
          }

          export function UntaggedHelperHost() {
            return (
              <section data-testid='UntaggedHelperHost'>
                <UntaggedHelper />
              </section>
            );
          }
        `,
        filename: "UntaggedHelperHost.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function KitchenSinkTaskDetailView() {
            return <CompactSurfaceSummary label='Task Detail View' entityType='issue' />;
          }
        `,
        filename: "KitchenSinkTaskDetailView.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          export function FragmentPanel() {
            return <></>;
          }
        `,
        filename: "FragmentPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "exportedFragmentRoot",
            data: {
              componentName: "FragmentPanel",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function CallResultPanel() {
            return makePanel();
          }
        `,
        filename: "CallResultPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "exportedOtherRoot",
            data: {
              componentName: "CallResultPanel",
              summary: "call expression",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function RootlessPanel() {
            return (
              <section>
                <div data-testid='RootlessPanel--body'>Ready</div>
              </section>
            );
          }
        `,
        filename: "RootlessPanel.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingExportedRootTestId",
            type: AST_NODE_TYPES.JSXOpeningElement,
            data: {
              componentName: "RootlessPanel",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          function LocalBadge() {
            return <div data-testid='WrongRoot'>Ready</div>;
          }

          export function LocalBadgeHost() {
            return (
              <section data-testid='LocalBadgeHost'>
                <LocalBadge />
              </section>
            );
          }
        `,
        filename: "LocalBadgeHost.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidLocalRootTestId",
            data: {
              componentName: "LocalBadge",
              candidate: "WrongRoot",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function ActionTray() {
            return (
              <section data-testid='ActionTray'>
                <button data-testid='WrongTray--action'>Go</button>
              </section>
            );
          }
        `,
        filename: "ActionTray.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidChildTestId",
            data: {
              componentName: "ActionTray",
              candidate: "WrongTray--action",
            },
          },
        ],
        output: null,
      },
      {
        code: `
          export function ChoiceTray(props) {
            return (
              <section data-testid='ChoiceTray'>
                <div data-testid={props.isWide ? 'ChoiceTray--body' : 'WrongTray--body'} />
              </section>
            );
          }
        `,
        filename: "ChoiceTray.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidChildTestId",
            data: {
              componentName: "ChoiceTray",
              candidate: "WrongTray--body",
            },
          },
        ],
        output: null,
      },
    ],
  },
);
