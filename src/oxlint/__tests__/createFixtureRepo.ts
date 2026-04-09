import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_ROOT_PATH = fileURLToPath(new URL("./fixtures/lint-target/", import.meta.url));

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

export function createFixtureRepo(fixtureName: string): string {
  const sourceFixtureDirectoryPath = join(FIXTURE_ROOT_PATH, fixtureName);
  if (!existsSync(sourceFixtureDirectoryPath)) {
    throw new Error(`Unknown lint-target fixture: ${fixtureName}`);
  }

  const fixtureRepositoryPath = mkdtempSync(join(tmpdir(), `typescript-ai-policy-${fixtureName}-`));
  copyFixtureDirectory(sourceFixtureDirectoryPath, fixtureRepositoryPath);

  return fixtureRepositoryPath;
}
