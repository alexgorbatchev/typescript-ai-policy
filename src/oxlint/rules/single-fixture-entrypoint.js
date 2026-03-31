import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPathFromTestsDirectory } from "./helpers.js";

const FIXTURE_ENTRYPOINT_CANDIDATE_KEYS = ["fixtures.ts", "fixtures.tsx", "fixtures/"];

function readFixtureEntrypointCandidateKey(filename) {
  const relativePath = readPathFromTestsDirectory(filename);
  if (relativePath === "fixtures.ts" || relativePath === "fixtures.tsx") {
    return relativePath;
  }

  if (relativePath?.startsWith("fixtures/")) {
    return "fixtures/";
  }

  return null;
}

function readTestsDirectoryPath(filename) {
  const relativePath = readPathFromTestsDirectory(filename);
  if (!relativePath) {
    return null;
  }

  return relativePath.split("/").reduce((currentPath) => dirname(currentPath), filename);
}

function isExistingDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function readExistingFixtureEntrypointCandidateKeys(testsDirectoryPath) {
  return FIXTURE_ENTRYPOINT_CANDIDATE_KEYS.filter((candidateKey) => {
    if (candidateKey === "fixtures/") {
      return isExistingDirectory(join(testsDirectoryPath, "fixtures"));
    }

    return existsSync(join(testsDirectoryPath, candidateKey));
  });
}

const singleFixtureEntrypointRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        'Allow only one fixture entrypoint shape per __tests__ directory so imports from "./fixtures" stay unambiguous',
    },
    schema: [],
    messages: {
      conflictingFixtureEntrypoints:
        'Only one fixture entrypoint shape is allowed per __tests__ directory for imports from "./fixtures". Found {{ entries }}.',
    },
  },
  create(context) {
    const currentCandidateKey = readFixtureEntrypointCandidateKey(context.filename);
    if (!currentCandidateKey) {
      return {};
    }

    const testsDirectoryPath = readTestsDirectoryPath(context.filename);
    if (!testsDirectoryPath) {
      return {};
    }

    const existingCandidateKeys = readExistingFixtureEntrypointCandidateKeys(testsDirectoryPath);
    if (existingCandidateKeys.length <= 1 || currentCandidateKey !== existingCandidateKeys[0]) {
      return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          messageId: "conflictingFixtureEntrypoints",
          data: {
            entries: existingCandidateKeys.join(", "),
          },
        });
      },
    };
  },
};

export default singleFixtureEntrypointRule;
