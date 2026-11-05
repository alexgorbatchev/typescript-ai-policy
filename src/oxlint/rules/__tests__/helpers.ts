import type { TestLanguageOptions } from "@typescript-eslint/rule-tester";
import { mkdirSync, mkdtempDisposableSync, readFileSync, writeFileSync, type DisposableTempDir } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TSESLint } from "@typescript-eslint/utils";
import { parseForESLint } from "@typescript-eslint/parser";
import storyFileLocationConventionRule from "../story-file-location-convention.ts";
import componentStoryFileConventionRule from "../component-story-file-convention.ts";

export const languageOpts: TestLanguageOptions = {
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: "module",
  },
};

export function createStoryOwnershipFixture(files: Record<string, string>): DisposableTempDir {
  const directory = mkdtempDisposableSync(join(tmpdir(), "story-ownership-"));
  try {
    writeFileSync(join(directory.path, "package.json"), '{"name":"ownership-fixture","type":"module"}');
    for (const [filename, source] of Object.entries(files)) {
      const path = join(directory.path, filename);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source);
    }
    return directory;
  } catch (error) {
    directory.remove();
    throw error;
  }
}

export function readStoryOwnershipDiagnostics(repositoryPath: string, filename: string): string[] {
  const path = join(repositoryPath, filename);
  const linter = new TSESLint.Linter({ cwd: repositoryPath });
  const ruleName = filename.endsWith(".stories.tsx") ? "story" : "component";
  const messages = linter.verify(
    readFileSync(path, "utf8"),
    [
      {
        files: ["**/*.tsx"],
        languageOptions: { parser: { parseForESLint }, parserOptions: languageOpts.parserOptions },
        plugins: {
          ownership: { rules: { story: storyFileLocationConventionRule, component: componentStoryFileConventionRule } },
        },
        rules: { [`ownership/${ruleName}`]: "error" },
      },
    ],
    { filename: path },
  );
  return messages.map((message) => message.messageId ?? message.message);
}
