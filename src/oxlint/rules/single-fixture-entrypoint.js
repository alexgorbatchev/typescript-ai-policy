import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPathFromStoriesDirectory, readPathFromTestsDirectory } from "./helpers.js";

const FIXTURE_ENTRYPOINT_CANDIDATE_KEYS = ["fixtures.ts", "fixtures.tsx", "fixtures/"];

function readFixtureDirectoryMatch(filename) {
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

function readFixtureEntrypointCandidateKey(filename) {
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

function readFixtureSupportDirectoryPath(filename) {
  const fixtureDirectoryMatch = readFixtureDirectoryMatch(filename);
  if (!fixtureDirectoryMatch) {
    return null;
  }

  return fixtureDirectoryMatch.relativePath.split("/").reduce((currentPath) => dirname(currentPath), filename);
}

function readFixtureSupportDirectoryLabel(filename) {
  return readFixtureDirectoryMatch(filename)?.directoryLabel ?? null;
}

function isExistingDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function readExistingFixtureEntrypointCandidateKeys(fixtureSupportDirectoryPath) {
  return FIXTURE_ENTRYPOINT_CANDIDATE_KEYS.filter((candidateKey) => {
    if (candidateKey === "fixtures/") {
      return isExistingDirectory(join(fixtureSupportDirectoryPath, "fixtures"));
    }

    return existsSync(join(fixtureSupportDirectoryPath, candidateKey));
  });
}

const singleFixtureEntrypointRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
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
