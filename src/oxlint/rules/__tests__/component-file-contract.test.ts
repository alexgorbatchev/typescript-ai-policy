import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { languageOpts } from "./helpers.ts";
import componentFileContractRuleModule from "../component-file-contract.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "component-file-contract enforces one direct named runtime component export per ownership file",
  componentFileContractRuleModule,
  {
    valid: [
      {
        code: `
          export interface IButtonProps { isReady: boolean; }

          function ButtonIcon() {
            return <span />;
          }

          export function Button() {
            return <ButtonIcon />;
          }
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export type ButtonProps = { isReady: boolean };

          export const Button = memo(function Button() {
            return <button />;
          });
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export const Button = observer(memo(function Button() {
            return <button />;
          }));
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `export const Button = () => <button />;`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainComponentExport" }],
        output: null,
      },
      {
        code: `export default function Button() { return <button />; }`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainComponentExport" }],
        output: null,
      },
      {
        code: `
          const Button = () => <button />;
          export { Button };
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainComponentExport" }],
        output: null,
      },
      {
        code: `
          export const Button = memo(function RenderButton() {
            return <button />;
          });
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainComponentExport" }],
        output: null,
      },
      {
        code: `
          export const Button = memo(function () {
            return <button />;
          });
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "invalidMainComponentExport" }],
        output: null,
      },
      {
        code: `
          export function Button() {
            return <button />;
          }

          export const BUTTON_SIZES = ['sm', 'md'];
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "unexpectedAdditionalRuntimeExport" }],
        output: null,
      },
      {
        code: `export type ButtonProps = { isReady: boolean };`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [{ messageId: "missingMainComponentExport" }],
        output: null,
      },
    ],
  },
);
