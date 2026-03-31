import { describe, expect, it } from "bun:test";
import { mergeConfig } from "../mergeConfig.ts";

type IMergeConfigFixture = {
  ignorePatterns: string[];
  plugins: string[];
  rules: Record<string, string>;
  settings: {
    custom?: {
      isEnabled: boolean;
    };
    next?: {
      rootDir: string;
    };
    react: {
      version: string;
    };
  };
};

describe("mergeConfig", () => {
  it("deep-merges objects while keeping user-only keys", () => {
    const userConfig: IMergeConfigFixture = {
      ignorePatterns: ["coverage"],
      plugins: ["promise"],
      rules: {
        "no-var": "error",
        eqeqeq: "warn",
      },
      settings: {
        custom: {
          isEnabled: true,
        },
        react: {
          version: "17.0.0",
        },
      },
    };
    const defaultConfig: IMergeConfigFixture = {
      ignorePatterns: ["dist"],
      plugins: ["typescript"],
      rules: {
        eqeqeq: "error",
      },
      settings: {
        next: {
          rootDir: "apps/web",
        },
        react: {
          version: "18.2.0",
        },
      },
    };

    expect(mergeConfig(userConfig, defaultConfig)).toEqual({
      ignorePatterns: ["coverage", "dist"],
      plugins: ["promise", "typescript"],
      rules: {
        "no-var": "error",
        eqeqeq: "error",
      },
      settings: {
        custom: {
          isEnabled: true,
        },
        next: {
          rootDir: "apps/web",
        },
        react: {
          version: "18.2.0",
        },
      },
    });
  });

  it("does not mutate either input config", () => {
    const userConfig: IMergeConfigFixture = {
      ignorePatterns: ["coverage"],
      plugins: ["promise"],
      rules: {
        eqeqeq: "warn",
      },
      settings: {
        react: {
          version: "17.0.0",
        },
      },
    };
    const defaultConfig: IMergeConfigFixture = {
      ignorePatterns: ["dist"],
      plugins: ["typescript"],
      rules: {
        eqeqeq: "error",
      },
      settings: {
        react: {
          version: "18.2.0",
        },
      },
    };

    mergeConfig(userConfig, defaultConfig);

    expect(userConfig).toEqual({
      ignorePatterns: ["coverage"],
      plugins: ["promise"],
      rules: {
        eqeqeq: "warn",
      },
      settings: {
        react: {
          version: "17.0.0",
        },
      },
    });
    expect(defaultConfig).toEqual({
      ignorePatterns: ["dist"],
      plugins: ["typescript"],
      rules: {
        eqeqeq: "error",
      },
      settings: {
        react: {
          version: "18.2.0",
        },
      },
    });
  });

  it("returns a new object graph instead of reusing input references", () => {
    const userConfig: IMergeConfigFixture = {
      ignorePatterns: ["coverage"],
      plugins: ["promise"],
      rules: {
        eqeqeq: "warn",
      },
      settings: {
        react: {
          version: "17.0.0",
        },
      },
    };
    const defaultConfig: IMergeConfigFixture = {
      ignorePatterns: ["dist"],
      plugins: ["typescript"],
      rules: {
        eqeqeq: "error",
      },
      settings: {
        react: {
          version: "18.2.0",
        },
      },
    };
    const mergedConfig = mergeConfig(userConfig, defaultConfig);

    expect(mergedConfig).not.toBe(userConfig);
    expect(mergedConfig).not.toBe(defaultConfig);
    expect(mergedConfig.ignorePatterns).not.toBe(userConfig.ignorePatterns);
    expect(mergedConfig.ignorePatterns).not.toBe(defaultConfig.ignorePatterns);
    expect(mergedConfig.settings).not.toBe(userConfig.settings);
    expect(mergedConfig.settings).not.toBe(defaultConfig.settings);
    expect(mergedConfig.settings.react).not.toBe(userConfig.settings.react);
    expect(mergedConfig.settings.react).not.toBe(defaultConfig.settings.react);
  });
});
