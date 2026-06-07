import { fileURLToPath } from "node:url";
import { defineConfig, type OxlintConfig } from "oxlint";
import { mergeConfig } from "../shared/mergeConfig.ts";
import { printPackageUsageNoticeOnce } from "../shared/packageUsageNotice.ts";
import { assertNoRuleCollisions } from "./assertNoRuleCollisions.ts";
import {
  DEFAULT_FILENAME_STYLE,
  FilenameStyle,
  isFilenameStyle,
  readHookOwnershipFileGlobs,
  readFilenameStyleLabel,
  readFilenameStyleLabels,
} from "./filenameStyle.ts";
import { COMPONENT_OWNERSHIP_DIRECTORY_GLOBS } from "./rules/helpers.ts";

export { FilenameStyle } from "./filenameStyle.ts";

export type OxlintConfigCallback = () => OxlintConfig;

export type CreateOxlintConfigOptions = {
  filenameStyle?: FilenameStyle;
};
export type CreateOxlintConfigInput = OxlintConfig & CreateOxlintConfigOptions;
type CreateOxlintConfigArgument = CreateOxlintConfigInput | OxlintConfigCallback;

type ResolvedCreateOxlintConfigInput = {
  filenameStyle: FilenameStyle;
  userConfig: OxlintConfig;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInvalidTopLevelInputError(): string {
  return "createOxlintConfig accepts either a config object or a callback that returns a config object.";
}

function readInvalidFilenameStyleError(): string {
  return `Invalid filenameStyle. Expected one of: ${readFilenameStyleLabels()
    .map((label) => `"${label}"`)
    .join(", ")}.`;
}

function readConfiguredFilenameStyle(filenameStyle: unknown): FilenameStyle {
  if (filenameStyle === undefined) {
    return DEFAULT_FILENAME_STYLE;
  }

  if (isFilenameStyle(filenameStyle)) {
    return filenameStyle;
  }

  throw new Error(readInvalidFilenameStyleError());
}

function readUserConfigFromCallback(callback: OxlintConfigCallback): OxlintConfig {
  const userConfig = callback();
  if (!isRecord(userConfig)) {
    throw new Error("createOxlintConfig callback must return a config object.");
  }

  return defineConfig(userConfig);
}

function readJsPluginSpecifier(): string {
  const pluginRelativePath = import.meta.url.endsWith("/createOxlintConfig.ts") ? "./plugin.ts" : "./oxlint-plugin.js";

  return fileURLToPath(new URL(pluginRelativePath, import.meta.url));
}

//
// The rules must be optimized for performance:
// - global rules are reserved for true ingress/leak policies that must inspect
//   arbitrary files
// - filename-addressable roles such as tests, stories, hooks, index barrels,
//   constants files, and types files belong in narrow overrides when the path
//   shape can identify them deterministically
//
function readDefaultOxlintConfig(filenameStyle: FilenameStyle): OxlintConfig {
  const filenameStyleLabel = readFilenameStyleLabel(filenameStyle);

  return defineConfig({
    ignorePatterns: [
      ".tmp",
      "**/.tmp",
      "**/.tmp/**",
      ".cache",
      ".venv",
      "**/.astro",
      "**/.react-email",
      "**/dist",
      "**/node_modules",
      "**/*.generated.ts",
      "**/*.gen.ts",
      "**/routeTree.gen.ts",
      "**/.vitepress/cache",
      "**/.vitepress/dist",
    ],
    plugins: ["unicorn", "typescript", "oxc", "react", "jest"],
    jsPlugins: [
      {
        name: "@alexgorbatchev",
        specifier: readJsPluginSpecifier(),
      },
    ],
    rules: {
      eqeqeq: "error",
      "@alexgorbatchev/no-react-create-element": "error",
      "@alexgorbatchev/no-imports-from-tests-directory": "error",
      "@alexgorbatchev/no-type-imports-from-constants": "error",
      "@alexgorbatchev/hook-export-location-convention": ["error", { filenameStyle: filenameStyleLabel }],
      "@alexgorbatchev/test-file-location-convention": "error",
      "@alexgorbatchev/no-fixture-exports-outside-fixture-entrypoint": "error",
      "@alexgorbatchev/no-lint-disable-comments": "error",
      "typescript/no-explicit-any": "error",
    },
    overrides: [
      {
        files: ["**/*.{ts,tsx,mts,cts}"],
        rules: {
          "@alexgorbatchev/interface-naming-convention": "error",
          "@alexgorbatchev/no-i-prefixed-type-aliases": "error",
          "@alexgorbatchev/no-direct-interface-to-type-assignment": "error",
          "@alexgorbatchev/no-trivial-forwarding-function": "error",
          "@alexgorbatchev/no-inline-type-expressions": "error",
          "@alexgorbatchev/no-inline-type-imports": "error",
          "@alexgorbatchev/require-template-indent": "error",
          "@alexgorbatchev/no-arbitrary-child-selectors": "error",
        },
      },
      {
        files: ["**/*.tsx"],
        rules: {
          "@alexgorbatchev/no-classname-style-props-outside-component-globs": "error",
          "@alexgorbatchev/no-intrinsic-elements-outside-component-globs": "error",
          "@alexgorbatchev/testid-naming-convention": "error",
          "@alexgorbatchev/require-component-root-testid": "error",
          "@alexgorbatchev/component-file-location-convention": "error",
          "@alexgorbatchev/component-file-contract": "error",
          "@alexgorbatchev/component-file-naming-convention": ["error", { filenameStyle: filenameStyleLabel }],
          "@alexgorbatchev/component-story-file-convention": "error",
        },
      },
      {
        files: ["**/.storybook/*.tsx", "**/.storybook/**/*.tsx"],
        rules: {
          "@alexgorbatchev/component-file-location-convention": "off",
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/component-file-contract": "off",
          "@alexgorbatchev/component-file-naming-convention": "off",
          "@alexgorbatchev/component-story-file-convention": "off",
          "@alexgorbatchev/no-intrinsic-elements-outside-component-globs": "off",
          "@alexgorbatchev/no-classname-style-props-outside-component-globs": "off",
        },
      },
      {
        files: [...COMPONENT_OWNERSHIP_DIRECTORY_GLOBS],
        rules: {
          "@alexgorbatchev/component-directory-file-convention": "error",
        },
      },
      {
        files: ["**/stories/**/*.tsx"],
        rules: {
          "@alexgorbatchev/component-file-location-convention": "off",
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/component-file-contract": "off",
          "@alexgorbatchev/component-file-naming-convention": "off",
          "@alexgorbatchev/component-story-file-convention": "off",
        },
      },
      {
        files: ["**/*.stories.tsx"],
        rules: {
          "@alexgorbatchev/component-file-location-convention": "off",
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/component-file-contract": "off",
          "@alexgorbatchev/component-file-naming-convention": "off",
          "@alexgorbatchev/component-story-file-convention": "off",
          "@alexgorbatchev/story-file-location-convention": "error",
          "@alexgorbatchev/story-meta-type-annotation": "error",
          "@alexgorbatchev/story-title-convention": "error",
          "@alexgorbatchev/story-export-contract": "error",
          "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
          "@alexgorbatchev/fixture-import-path-convention": "error",
        },
      },
      {
        files: ["**/stories/**/*"],
        rules: {
          "@alexgorbatchev/stories-directory-file-convention": "error",
        },
      },
      {
        files: ["**/__tests__/**/*.tsx"],
        rules: {
          "@alexgorbatchev/component-file-location-convention": "off",
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/component-file-contract": "off",
          "@alexgorbatchev/component-file-naming-convention": "off",
          "@alexgorbatchev/component-story-file-convention": "off",
        },
      },
      {
        files: ["**/*.test.tsx"],
        rules: {
          "@alexgorbatchev/component-file-location-convention": "off",
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/component-file-contract": "off",
          "@alexgorbatchev/component-file-naming-convention": "off",
          "@alexgorbatchev/component-story-file-convention": "off",
        },
      },
      {
        files: readHookOwnershipFileGlobs(filenameStyle),
        rules: {
          "@alexgorbatchev/hook-file-contract": "error",
          "@alexgorbatchev/hook-file-naming-convention": ["error", { filenameStyle: filenameStyleLabel }],
          "@alexgorbatchev/hook-test-file-convention": "error",
        },
      },
      {
        files: ["**/hooks/**/*"],
        rules: {
          "@alexgorbatchev/hooks-directory-file-convention": ["error", { filenameStyle: filenameStyleLabel }],
        },
      },
      {
        files: ["**/index.{ts,tsx}"],
        rules: {
          "@alexgorbatchev/index-file-contract": "error",
        },
      },
      {
        files: ["**/constants.{ts,tsx,mts,cts}", "**/constants.d.{ts,tsx,mts,cts}"],
        rules: {
          "@alexgorbatchev/no-type-exports-from-constants": "error",
        },
      },
      {
        files: ["**/types.{ts,tsx,mts,cts}", "**/types.d.{ts,tsx,mts,cts}"],
        rules: {
          "@alexgorbatchev/no-value-exports-from-types": "error",
        },
      },
      {
        files: ["**/__tests__/**"],
        rules: {
          "@alexgorbatchev/no-module-mocking": "error",
          "@alexgorbatchev/tests-directory-file-convention": "error",
        },
      },
      {
        files: ["**/__tests__/*.test.{ts,tsx}", "**/__tests__/**/*.test.{ts,tsx}"],
        rules: {
          "@alexgorbatchev/testid-naming-convention": "off",
          "@alexgorbatchev/require-component-root-testid": "off",
          "@alexgorbatchev/no-non-running-tests": "error",
          "@alexgorbatchev/no-conditional-logic-in-tests": "error",
          "@alexgorbatchev/no-throw-in-tests": "error",
          "@alexgorbatchev/no-test-file-exports": "error",
          "@alexgorbatchev/no-inline-fixture-bindings-in-tests": "error",
          "@alexgorbatchev/fixture-import-path-convention": "error",
          "jest/no-disabled-tests": "error",
          "jest/no-focused-tests": "error",
        },
      },
      {
        files: [
          "**/__tests__/fixtures.{ts,tsx}",
          "**/__tests__/**/fixtures.{ts,tsx}",
          "**/stories/fixtures.{ts,tsx}",
          "**/stories/**/fixtures.{ts,tsx}",
        ],
        rules: {
          "@alexgorbatchev/fixture-file-contract": "error",
          "@alexgorbatchev/fixture-export-naming-convention": "error",
          "@alexgorbatchev/fixture-export-type-contract": "error",
        },
      },
      {
        files: [
          "**/__tests__/fixtures.{ts,tsx}",
          "**/__tests__/fixtures/**/*.{ts,tsx}",
          "**/__tests__/**/fixtures.{ts,tsx}",
          "**/__tests__/**/fixtures/**/*.{ts,tsx}",
          "**/stories/fixtures.{ts,tsx}",
          "**/stories/fixtures/**/*.{ts,tsx}",
          "**/stories/**/fixtures.{ts,tsx}",
          "**/stories/**/fixtures/**/*.{ts,tsx}",
        ],
        rules: {
          "@alexgorbatchev/no-local-type-declarations-in-fixture-files": "error",
          "@alexgorbatchev/single-fixture-entrypoint": "error",
        },
      },
    ],
  });
}

function readResolvedCreateOxlintConfigInput(input?: CreateOxlintConfigArgument): ResolvedCreateOxlintConfigInput {
  if (!input) {
    return {
      filenameStyle: DEFAULT_FILENAME_STYLE,
      userConfig: defineConfig({}),
    };
  }

  if (typeof input === "function") {
    return {
      filenameStyle: DEFAULT_FILENAME_STYLE,
      userConfig: readUserConfigFromCallback(input),
    };
  }

  if (!isRecord(input)) {
    throw new Error(readInvalidTopLevelInputError());
  }

  const { filenameStyle, ...userConfig } = input;

  return {
    filenameStyle: readConfiguredFilenameStyle(filenameStyle),
    userConfig: defineConfig(userConfig),
  };
}

export default function createOxlintConfig(callback: OxlintConfigCallback): OxlintConfig;
export default function createOxlintConfig(input?: CreateOxlintConfigInput): OxlintConfig;
export default function createOxlintConfig(input?: CreateOxlintConfigArgument): OxlintConfig {
  printPackageUsageNoticeOnce();

  const { filenameStyle, userConfig } = readResolvedCreateOxlintConfigInput(input);
  const defaultOxlintConfig = readDefaultOxlintConfig(filenameStyle);

  assertNoRuleCollisions(userConfig, defaultOxlintConfig);

  return defineConfig(mergeConfig(userConfig, defaultOxlintConfig));
}
