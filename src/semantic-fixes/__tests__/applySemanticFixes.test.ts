import { expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { applySemanticFixes } from "../applySemanticFixes.ts";
import type { IApplySemanticFixesProgressEvent } from "../types.ts";

type IProjectFile = {
  content: string;
  filePath: string;
};

async function writeProjectFiles(projectPath: string, projectFiles: readonly IProjectFile[]): Promise<void> {
  for (const projectFile of projectFiles) {
    const absoluteFilePath = join(projectPath, projectFile.filePath);
    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, projectFile.content, "utf8");
  }
}

async function createProject(projectFiles: readonly IProjectFile[]): Promise<string> {
  const projectPath = await mkdtemp(join(tmpdir(), "semantic-fixes-test-"));
  await writeProjectFiles(projectPath, projectFiles);
  return projectPath;
}

function readOptions(targetDirectoryPath: string) {
  return {
    oxlintConfigPath: resolve(process.cwd(), "src/oxlint/oxlint.config.ts"),
    oxlintExecutablePath: resolve(process.cwd(), "node_modules/.bin/oxlint"),
    targetDirectoryPath,
    tsgoExecutablePath: resolve(process.cwd(), "node_modules/.bin/tsgo"),
  };
}

it("applies interface naming fixes through the tsgo LSP backend", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `export interface UserProfile {
  id: string;
}

export function readProfileId(profile: UserProfile): string {
  return profile.id;
}
`,
      filePath: "models.ts",
    },
    {
      content: `import type { UserProfile } from "./models";

export function formatProfile(profile: UserProfile): string {
  return profile.id;
}
`,
      filePath: "consumer.ts",
    },
  ]);

  try {
    const result = await applySemanticFixes(readOptions(projectPath));

    expect(result).toEqual({
      appliedFileCount: 2,
      backendName: "tsgo-lsp+native",
      changedFilePaths: [join(projectPath, "consumer.ts"), join(projectPath, "models.ts")],
      plannedFixCount: 1,
      skippedDiagnostics: [],
    });
    expect(await readFile(join(projectPath, "models.ts"), "utf8")).toBe(`export interface IUserProfile {
  id: string;
}

export function readProfileId(profile: IUserProfile): string {
  return profile.id;
}
`);
    expect(await readFile(join(projectPath, "consumer.ts"), "utf8")).toBe(`import type { IUserProfile } from "./models";

export function formatProfile(profile: IUserProfile): string {
  return profile.id;
}
`);
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});

it("reports progress while planning and applying semantic fixes", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `export interface UserProfile {
  id: string;
}

export function readProfileId(profile: UserProfile): string {
  return profile.id;
}
`,
      filePath: "models.ts",
    },
    {
      content: `import type { UserProfile } from "./models";

export function formatProfile(profile: UserProfile): string {
  return profile.id;
}
`,
      filePath: "consumer.ts",
    },
  ]);

  try {
    const progressEvents: IApplySemanticFixesProgressEvent[] = [];

    await applySemanticFixes({
      ...readOptions(projectPath),
      onProgress(event) {
        progressEvents.push(event);
      },
    });

    expect(progressEvents).toEqual([
      {
        kind: "running-oxlint",
        targetDirectoryPath: projectPath,
      },
      {
        diagnosticCount: 1,
        kind: "collected-diagnostics",
      },
      {
        kind: "planning-start",
        operationCount: 1,
      },
      {
        description: "Rename UserProfile to IUserProfile",
        kind: "planning-operation",
        operationCount: 1,
        operationId: `@alexgorbatchev/interface-naming-convention:${join(projectPath, "models.ts")}:0:17:IUserProfile`,
        operationIndex: 1,
      },
      {
        dryRun: false,
        fileCount: 2,
        kind: "applying-file-changes",
        moveCount: 0,
        textEditCount: 4,
      },
      {
        appliedFileCount: 2,
        changedFileCount: 2,
        kind: "complete",
        plannedFixCount: 1,
        skippedDiagnosticCount: 0,
      },
    ]);
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});

it("moves misplaced .test.ts files into a sibling __tests__ directory and rewrites relative imports", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `export function SignalPanel(): string {
  return "ready";
}
`,
      filePath: "widgets/SignalPanel.ts",
    },
    {
      content: `export function readPanelLabel(): string {
  return "label";
}
`,
      filePath: "widgets/readPanelLabel.ts",
    },
    {
      content: `import { expect, test } from "bun:test";
import { SignalPanel } from "./SignalPanel";
import { readPanelLabel } from "./readPanelLabel";

test("renders", () => {
  expect(SignalPanel()).toBe("ready");
  expect(readPanelLabel()).toBe("label");
});
`,
      filePath: "widgets/SignalPanel.test.ts",
    },
  ]);

  try {
    const result = await applySemanticFixes(readOptions(projectPath));

    expect(result).toEqual({
      appliedFileCount: 1,
      backendName: "tsgo-lsp+native",
      changedFilePaths: [join(projectPath, "widgets/__tests__/SignalPanel.test.ts")],
      plannedFixCount: 1,
      skippedDiagnostics: [],
    });
    expect(await readFile(join(projectPath, "widgets/__tests__/SignalPanel.test.ts"), "utf8"))
      .toBe(`import { expect, test } from "bun:test";
import { SignalPanel } from "../SignalPanel";
import { readPanelLabel } from "../readPanelLabel";

test("renders", () => {
  expect(SignalPanel()).toBe("ready");
  expect(readPanelLabel()).toBe("label");
});
`);
    await expect(readFile(join(projectPath, "widgets/SignalPanel.test.ts"), "utf8")).rejects.toThrow();
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});

it("skips misplaced .test.ts moves when the canonical __tests__ file already exists", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `import { test } from "bun:test";

test("renders", () => {});
`,
      filePath: "widgets/SignalPanel.test.ts",
    },
    {
      content: `import { test } from "bun:test";

test("canonical", () => {});
`,
      filePath: "widgets/__tests__/SignalPanel.test.ts",
    },
  ]);

  try {
    const result = await applySemanticFixes(readOptions(projectPath));

    expect(result).toEqual({
      appliedFileCount: 0,
      backendName: "tsgo-lsp+native",
      changedFilePaths: [],
      plannedFixCount: 0,
      skippedDiagnostics: [
        {
          filePath: join(projectPath, "widgets/SignalPanel.test.ts"),
          reason: `Cannot move test file because the canonical destination already exists: ${join(projectPath, "widgets/__tests__/SignalPanel.test.ts")}`,
          ruleCode: "@alexgorbatchev/test-file-location-convention",
        },
      ],
    });
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});

it("reports dry-run plans without mutating files", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `export interface UserProfile {
  id: string;
}
`,
      filePath: "models.ts",
    },
  ]);

  try {
    const result = await applySemanticFixes({
      ...readOptions(projectPath),
      dryRun: true,
    });

    expect(result).toEqual({
      appliedFileCount: 0,
      backendName: "tsgo-lsp+native",
      changedFilePaths: [join(projectPath, "models.ts")],
      plannedFixCount: 1,
      skippedDiagnostics: [],
    });
    expect(await readFile(join(projectPath, "models.ts"), "utf8")).toBe(`export interface UserProfile {
  id: string;
}
`);
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});

it("skips interface names that cannot be safely normalized mechanically", async () => {
  const projectPath = await createProject([
    {
      content: `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
      filePath: "tsconfig.json",
    },
    {
      content: `export interface user_profile {
  id: string;
}
`,
      filePath: "models.ts",
    },
  ]);

  try {
    const result = await applySemanticFixes(readOptions(projectPath));

    expect(result).toEqual({
      appliedFileCount: 0,
      backendName: "tsgo-lsp+native",
      changedFilePaths: [],
      plannedFixCount: 0,
      skippedDiagnostics: [
        {
          filePath: join(projectPath, "models.ts"),
          reason: "No safe semantic fix is available for this diagnostic.",
          ruleCode: "@alexgorbatchev/interface-naming-convention",
        },
      ],
    });
    expect(await readFile(join(projectPath, "models.ts"), "utf8")).toBe(`export interface user_profile {
  id: string;
}
`);
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});
