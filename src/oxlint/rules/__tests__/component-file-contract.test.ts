import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import componentFileContractRuleModule from "../component-file-contract.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run(
  "component-file-contract enforces one direct named runtime component export or one multipart component family per ownership file",
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
      {
        code: `
          export function SelectTrigger() {
            return <button />;
          }

          export const Select = forwardRef(function Select() {
            return <button />;
          });

          export function SelectValue() {
            return <span />;
          }
        `,
        filename: "src/ui/components/select.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `
          export function Button() {
            return <button />;
          }
          
          export default Button;
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
        errors: [
          {
            messageId: "invalidIndirectComponentExport",
            type: AST_NODE_TYPES.Identifier,
          },
        ],
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

          export function PauseResumeButton() {
            return <button />;
          }
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedAdditionalRuntimeExport",
            type: AST_NODE_TYPES.Identifier,
          },
        ],
        output: null,
      },
      {
        code: `
          export function Button() {
            return <button />;
          }

          export const ButtonSizes = ["sm", "md"];
        `,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "unexpectedAdditionalRuntimeExport",
            type: AST_NODE_TYPES.Identifier,
          },
        ],
        output: null,
      },
      {
        code: `
          function Avatar() {
            return <div />;
          }

          function AvatarImage() {
            return <img />;
          }

          function AvatarFallback() {
            return <span />;
          }

          export { Avatar, AvatarImage, AvatarFallback };
        `,
        filename: "src/ui/components/avatar.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "invalidIndirectComponentExport",
            type: AST_NODE_TYPES.Identifier,
          },
          {
            messageId: "invalidIndirectComponentExport",
            type: AST_NODE_TYPES.Identifier,
          },
          {
            messageId: "invalidIndirectComponentExport",
            type: AST_NODE_TYPES.Identifier,
          },
        ],
        output: null,
      },
      {
        code: `export type ButtonProps = { isReady: boolean };`,
        filename: "src/ui/components/Button.tsx",
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingMainComponentExport",
            type: AST_NODE_TYPES.ExportNamedDeclaration,
          },
        ],
        output: null,
      },
    ],
  },
);
