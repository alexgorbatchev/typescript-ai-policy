import {
  cpSync,
  mkdirSync,
  mkdtempDisposableSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  type DisposableTempDir,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { TSESLint } from "@typescript-eslint/utils";
import { parseForESLint } from "@typescript-eslint/parser";
import rule from "../../no-classname-style-props-outside-component-globs.ts";
import { createFixtureRepo } from "../../../test-support/createFixtureRepo.ts";
import { runLintTargetWithConfigPath, type LintTargetResult } from "../../../test-support/runLintTarget.ts";

function copyPackage(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const target = join(destination, entry.name.replace(/\.txt$/u, ""));
    if (entry.isDirectory()) copyPackage(join(source, entry.name), target);
    else cpSync(join(source, entry.name), target);
  }
}

export function installNativeFixturePackage(repository: string): void {
  copyPackage(join(import.meta.dir, "fixtures/package"), join(repository, "node_modules/@base-ui/react"));
}

export function createNativeFixture(files: Record<string, string> = {}): DisposableTempDir {
  const directory = mkdtempDisposableSync(join(tmpdir(), "native-styling-"));
  try {
    writeFileSync(join(directory.path, "package.json"), '{"name":"native-style-fixture","type":"module"}');
    installNativeFixturePackage(directory.path);
    for (const [filename, content] of Object.entries(files)) {
      const target = join(directory.path, filename);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    return directory;
  } catch (error) {
    directory.remove();
    throw error;
  }
}

export function readNativeDiagnostics(
  repository: string,
  source: string,
  filename = "src/components/Example.tsx",
): string[] {
  const linter = new TSESLint.Linter({ cwd: repository });
  const messages = linter.verify(
    source,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser: { parseForESLint },
          parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
        },
        plugins: { native: { rules: { styling: rule } } },
        rules: { "native/styling": "error" },
      },
    ],
    { filename: join(repository, filename) },
  );
  return messages.map((message) => message.messageId ?? message.message);
}

export function runNativeIntegration(fixturePath: string): LintTargetResult {
  using repository = createFixtureRepo(`native-styling/${fixturePath}`);
  installNativeFixturePackage(repository.path);
  const config = join(repository.path, "oxlint.config.ts");
  const factory = resolve(import.meta.dir, "../../../createOxlintConfig.ts");
  writeFileSync(
    config,
    `import createOxlintConfig from ${JSON.stringify(factory)};\nexport default createOxlintConfig({});\n`,
  );
  return runLintTargetWithConfigPath(repository.path, config);
}

export function replaceNativePackageMetadata(repository: string, name: string, version: string): void {
  const target = join(repository, "node_modules/@base-ui/react/package.json");
  const metadata = JSON.parse(readFileSync(target, "utf8"));
  writeFileSync(target, JSON.stringify({ ...metadata, name, version }));
}

export function readNativeSurfaceFixture(name: string): string {
  return readFileSync(join(import.meta.dir, `fixtures/${name}.tsx.txt`), "utf8");
}
