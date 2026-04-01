import type { RuleModule } from "./types.ts";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPathFromStoriesDirectory, readPathFromTestsDirectory } from "./helpers.ts";

const FIXTURE_ENTRYPOINT_CANDIDATE_KEYS = ["fixtures.ts", "fixtures.tsx", "fixtures/"];

type FixtureDirectoryMatch = {
  directoryLabel: string;
  relativePath: string;
};

function readFixtureDirectoryMatch(filename: string): FixtureDirectoryMatch | null {
  const testsRelativePath = readPathFromTestsDirectory(filename);
  if (testsRelativePath !== null) {
    return {
      directoryLabel: "__tests__",
      relativePath: testsRelativePath,
    };
  }

  const storiesRelativePath = readPathFromStoriesDirectory(filename);
  if (storiesRelativePath !== null) {
    return {
      directoryLabel: "stories",
      relativePath: storiesRelativePath,
    };
  }

  return null;
}

function readFixtureEntrypointCandidateKey(filename: string): string | null {
  const fixtureDirectoryMatch = readFixtureDirectoryMatch(filename);
  if (!fixtureDirectoryMatch) {
    return null;
  }

  if (fixtureDirectoryMatch.relativePath === "fixtures.ts" || fixtureDirectoryMatch.relativePath === "fixtures.tsx") {
    return fixtureDirectoryMatch.relativePath;
  }

  if (fixtureDirectoryMatch.relativePath.startsWith("fixtures/")) {
    return "fixtures/";
  }

  return null;
}

function readFixtureSupportDirectoryPath(filename: string): string | null {
  const fixtureDirectoryMatch = readFixtureDirectoryMatch(filename);
  if (!fixtureDirectoryMatch) {
    return null;
  }

  return fixtureDirectoryMatch.relativePath.split("/").reduce((currentPath) => dirname(currentPath), filename);
}

function readFixtureSupportDirectoryLabel(filename: string): string | null {
  return readFixtureDirectoryMatch(filename)?.directoryLabel ?? null;
}

function isExistingDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function readExistingFixtureEntrypointCandidateKeys(fixtureSupportDirectoryPath: string): string[] {
  return FIXTURE_ENTRYPOINT_CANDIDATE_KEYS.filter((candidateKey) => {
    if (candidateKey === "fixtures/") {
      return isExistingDirectory(join(fixtureSupportDirectoryPath, "fixtures"));
    }

    return existsSync(join(fixtureSupportDirectoryPath, candidateKey));
  });
}

const singleFixtureEntrypointRule: RuleModule = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        'Allow only one fixture entrypoint shape per "__tests__" or "stories" directory so imports from "./fixtures" stay unambiguous',
    },
    schema: [],
    messages: {
      conflictingFixtureEntrypoints:
        'Keep exactly one fixture entrypoint shape in this "{{ directoryLabel }}" directory so "./fixtures" resolves unambiguously. Remove all but one of: {{ entries }}.',
    },
  },
  create(context) {
    const currentCandidateKey = readFixtureEntrypointCandidateKey(context.filename);
    if (!currentCandidateKey) {
      return {};
    }

    const fixtureSupportDirectoryPath = readFixtureSupportDirectoryPath(context.filename);
    const directoryLabel = readFixtureSupportDirectoryLabel(context.filename);
    if (!fixtureSupportDirectoryPath || !directoryLabel) {
      return {};
    }

    const existingCandidateKeys = readExistingFixtureEntrypointCandidateKeys(fixtureSupportDirectoryPath);
    if (existingCandidateKeys.length <= 1 || currentCandidateKey !== existingCandidateKeys[0]) {
      return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          messageId: "conflictingFixtureEntrypoints",
          data: {
            directoryLabel,
            entries: existingCandidateKeys.join(", "),
          },
        });
      },
    };
  },
};

export default singleFixtureEntrypointRule;
