import type { RuleModule } from "./types.ts";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPathFromStoriesDirectory, readPathFromTestsDirectory, readProgramReportNode } from "./helpers.ts";

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

  const relativePathSegments = fixtureDirectoryMatch.relativePath.split("/").filter(Boolean);
  const lastPathSegment = relativePathSegments.at(-1);

  if (lastPathSegment === "fixtures.ts" || lastPathSegment === "fixtures.tsx") {
    return lastPathSegment;
  }

  if (relativePathSegments.includes("fixtures")) {
    return "fixtures/";
  }

  return null;
}

function readFixtureSupportDirectoryPath(filename: string): string | null {
  const fixtureDirectoryMatch = readFixtureDirectoryMatch(filename);
  if (!fixtureDirectoryMatch) {
    return null;
  }

  const relativePathSegments = fixtureDirectoryMatch.relativePath.split("/").filter(Boolean);
  const fixtureFileIndex = relativePathSegments.findLastIndex(
    (pathSegment) => pathSegment === "fixtures.ts" || pathSegment === "fixtures.tsx",
  );
  const fixtureDirectoryIndex = relativePathSegments.lastIndexOf("fixtures");
  const fixtureSegmentIndex = fixtureFileIndex === -1 ? fixtureDirectoryIndex : fixtureFileIndex;
  if (fixtureSegmentIndex === -1) {
    return null;
  }

  const levelsToAscend = relativePathSegments.length - fixtureSegmentIndex;

  let currentPath = filename;
  for (let levelIndex = 0; levelIndex < levelsToAscend; levelIndex += 1) {
    currentPath = dirname(currentPath);
  }

  return currentPath;
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
        'Allow only one fixture entrypoint shape per fixture-support directory under "__tests__" or "stories" so imports from "./fixtures" stay unambiguous',
    },
    schema: [],
    messages: {
      conflictingFixtureEntrypoints:
        'Keep exactly one fixture entrypoint shape in this fixture-support directory under "{{ directoryLabel }}" so "./fixtures" resolves unambiguously. Remove all but one of: {{ entries }}.',
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
          node: readProgramReportNode(node),
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
