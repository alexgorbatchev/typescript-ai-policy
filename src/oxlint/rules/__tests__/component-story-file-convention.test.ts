import { afterAll, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { languageOpts } from "./helpers.ts";
import componentStoryFileConventionRuleModule from "../component-story-file-convention.ts";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tempRootDirectoryPath = mkdtempSync(join(tmpdir(), "component-story-file-convention-"));

afterAll(() => {
  rmSync(tempRootDirectoryPath, { recursive: true, force: true });
});

function createComponentDirectoryPath(name: string): string {
  const packagePath = join(tempRootDirectoryPath, name);
  const directoryPath = join(packagePath, "components");
  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(join(packagePath, "package.json"), JSON.stringify({ type: "module" }));
  return directoryPath;
}

const validDirectStoryComponentDirectoryPath = createComponentDirectoryPath("valid-direct-story");
mkdirSync(join(validDirectStoryComponentDirectoryPath, "stories"), { recursive: true });
writeFileSync(
  join(validDirectStoryComponentDirectoryPath, "Button.tsx"),
  "export function Button() { return <button />; }\n",
);
writeFileSync(
  join(validDirectStoryComponentDirectoryPath, "stories", "Button.stories.tsx"),
  `import type { Meta } from "@storybook/react";
import { Button } from "../Button";
const meta: Meta<typeof Button> = { component: Button };
export default meta;
`,
);

const validNestedStoryComponentDirectoryPath = createComponentDirectoryPath("valid-nested-story");
mkdirSync(join(validNestedStoryComponentDirectoryPath, "stories", "catalog"), { recursive: true });
writeFileSync(
  join(validNestedStoryComponentDirectoryPath, "account-panel.tsx"),
  "export function AccountPanel() { return <section />; }\n",
);
writeFileSync(
  join(validNestedStoryComponentDirectoryPath, "stories", "catalog", "account-panel.stories.tsx"),
  `import type { Meta } from "@storybook/react";
import { AccountPanel } from "../../account-panel";
const meta: Meta<typeof AccountPanel> = { component: AccountPanel };
export default meta;
`,
);

const validComponentTestsDirectoryPath = createComponentDirectoryPath("valid-component-tests");
mkdirSync(join(validComponentTestsDirectoryPath, "stories"), { recursive: true });
mkdirSync(join(validComponentTestsDirectoryPath, "__tests__"), { recursive: true });
writeFileSync(join(validComponentTestsDirectoryPath, "Badge.tsx"), "export function Badge() { return <div />; }\n");
writeFileSync(
  join(validComponentTestsDirectoryPath, "stories", "Badge.stories.tsx"),
  `import type { Meta } from "@storybook/react";
import { Badge } from "../Badge";
const meta: Meta<typeof Badge> = { component: Badge };
export default meta;
`,
);
writeFileSync(
  join(validComponentTestsDirectoryPath, "__tests__", "Badge.test.tsx"),
  `import { expect, test } from "bun:test";
import { Badge } from "../Badge";
test("renders the badge", () => { expect(Badge().type).toBe("div"); });
`,
);

const missingStoryComponentDirectoryPath = createComponentDirectoryPath("missing-story");
mkdirSync(join(missingStoryComponentDirectoryPath, "stories", "variants"), { recursive: true });
writeFileSync(join(missingStoryComponentDirectoryPath, "Other.tsx"), "export function Other() { return <div />; }\n");
writeFileSync(
  join(missingStoryComponentDirectoryPath, "stories", "variants", "Other.stories.tsx"),
  `import type { Meta } from "@storybook/react";
import { Other } from "../../Other";
const meta: Meta<typeof Other> = { component: Other };
export default meta;
`,
);

const ruleTester = new RuleTester();

ruleTester.run(
  "component-story-file-convention requires stories that resolve to the exact component source",
  componentStoryFileConventionRuleModule,
  {
    valid: [
      {
        code: 'import { createRoot } from "react-dom/client"; import { App } from "./components/App"; createRoot(document.getElementById("root")).render(<App />);',
        filename: "src/main.tsx",
        languageOptions: languageOpts,
      },
      {
        code: `export function Button() { return <button />; }`,
        filename: join(validDirectStoryComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export function AccountPanel() { return <section />; }`,
        filename: join(validNestedStoryComponentDirectoryPath, "account-panel.tsx"),
        languageOptions: languageOpts,
      },
      {
        code: `export function Badge() { return <div />; }`,
        filename: join(validComponentTestsDirectoryPath, "Badge.tsx"),
        languageOptions: languageOpts,
      },
    ],
    invalid: [
      {
        code: `
          import { memo } from "react";

          export const Button = memo(function Button() {
            return <button />;
          });
        `,
        filename: join(missingStoryComponentDirectoryPath, "Button.tsx"),
        languageOptions: languageOpts,
        errors: [
          {
            messageId: "missingComponentStoryFile",
            type: AST_NODE_TYPES.Identifier,
          },
        ],
        output: null,
      },
    ],
  },
);
