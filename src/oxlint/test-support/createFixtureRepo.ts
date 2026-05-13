import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_ROOT_PATH = fileURLToPath(new URL("../__tests__/fixtures/lint-target/", import.meta.url));
const REPOSITORY_TMP_DIRECTORY_PATH = resolve(import.meta.dir, "../../..", ".tmp");

function copyFixtureDirectory(sourceDirectoryPath: string, destinationDirectoryPath: string): void {
  mkdirSync(destinationDirectoryPath, { recursive: true });

  const directoryEntries = readdirSync(sourceDirectoryPath, { withFileTypes: true });

  directoryEntries.forEach((directoryEntry) => {
    const sourceEntryPath = join(sourceDirectoryPath, directoryEntry.name);
    const destinationEntryName =
      directoryEntry.isFile() && directoryEntry.name.endsWith(".txt")
        ? directoryEntry.name.slice(0, -".txt".length)
        : directoryEntry.name;
    const destinationEntryPath = join(destinationDirectoryPath, destinationEntryName);

    if (directoryEntry.isDirectory()) {
      copyFixtureDirectory(sourceEntryPath, destinationEntryPath);
      return;
    }

    copyFileSync(sourceEntryPath, destinationEntryPath);
  });
}

function readFixtureDirectoryPrefix(fixturePath: string): string {
  return fixturePath.replaceAll("/", "-");
}

export function createFixtureRepo(fixturePath: string): string {
  const sourceFixtureDirectoryPath = join(FIXTURE_ROOT_PATH, fixturePath);
  if (!existsSync(sourceFixtureDirectoryPath)) {
    throw new Error(`Unknown lint-target fixture: ${fixturePath}`);
  }

  const fixtureDirectoryPrefix = readFixtureDirectoryPrefix(fixturePath);
  mkdirSync(REPOSITORY_TMP_DIRECTORY_PATH, { recursive: true });

  const fixtureRepositoryPath = mkdtempSync(
    join(REPOSITORY_TMP_DIRECTORY_PATH, `typescript-ai-policy-${fixtureDirectoryPrefix}-`),
  );
  copyFixtureDirectory(sourceFixtureDirectoryPath, fixtureRepositoryPath);

  const packageJsonPath = join(fixtureRepositoryPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    writeFileSync(packageJsonPath, '{"type":"module"}\n', "utf8");
  }

  return fixtureRepositoryPath;
}
