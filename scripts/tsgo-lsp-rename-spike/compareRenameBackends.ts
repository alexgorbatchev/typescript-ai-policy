import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { readTsgoRenameResult } from "./readTsgoRenameResult.ts";
import { readTypeScriptRenameResult } from "./readTypeScriptRenameResult.ts";
import type { IRenameCaseComparison, IRenameComparisonCase, IPreparedProject, ISourceFileFixture } from "./types.ts";

const MARKER = "/*rename*/";

const TS_RENAME_COMPARISON_CASES: readonly IRenameComparisonCase[] = [
  {
    description: "Cross-file exported interface rename updates declarations, imports, and type references.",
    files: [
      {
        content: `export interface /*rename*/UserProfile {
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
    ],
    name: "cross-file-exported-interface",
    target: {
      filePath: "models.ts",
      marker: MARKER,
      newName: "IUserProfile",
    },
    tsconfigContent: `{
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
  },
  {
    description: "Declaration merging renames every merged declaration plus downstream type references.",
    files: [
      {
        content: `export interface /*rename*/UserProfile {
  id: string;
}

export interface UserProfile {
  name: string;
}

export function formatProfile(profile: UserProfile): string {
  return profile.id + ":" + profile.name;
}
`,
        filePath: "contracts.ts",
      },
    ],
    name: "declaration-merging",
    target: {
      filePath: "contracts.ts",
      marker: MARKER,
      newName: "IUserProfile",
    },
    tsconfigContent: `{
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
  },
  {
    description: "Ambient Window merging is blocked because the symbol belongs to the standard library contract.",
    files: [
      {
        content: `declare global {
  interface /*rename*/Window {
    analytics: {
      track(eventName: string): void;
    };
  }
}

export {};
`,
        filePath: "globals.d.ts",
      },
    ],
    name: "ambient-window",
    target: {
      filePath: "globals.d.ts",
      marker: MARKER,
      newName: "IWindow",
    },
    tsconfigContent: `{
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
  },
  {
    description:
      "Public declaration files can still be renamed semantically even though policy may choose to skip them.",
    files: [
      {
        content: `export interface /*rename*/UserProfile {
  id: string;
}

export type UserProfileMap = Map<string, UserProfile>;
`,
        filePath: "public-api.d.ts",
      },
    ],
    name: "public-dts-interface",
    target: {
      filePath: "public-api.d.ts",
      marker: MARKER,
      newName: "IUserProfile",
    },
    tsconfigContent: `{
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
  },
];

type IPreparedFile = {
  content: string;
  targetOffset: number | null;
};

function readPreparedFile(
  sourceFileFixture: ISourceFileFixture,
  targetFilePath: string,
  marker: string,
): IPreparedFile {
  if (sourceFileFixture.filePath !== targetFilePath) {
    return {
      content: sourceFileFixture.content,
      targetOffset: null,
    };
  }

  const markerIndex = sourceFileFixture.content.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Missing rename marker in ${sourceFileFixture.filePath}`);
  }

  const secondMarkerIndex = sourceFileFixture.content.indexOf(marker, markerIndex + marker.length);
  if (secondMarkerIndex !== -1) {
    throw new Error(`Expected exactly one rename marker in ${sourceFileFixture.filePath}`);
  }

  return {
    content:
      sourceFileFixture.content.slice(0, markerIndex) + sourceFileFixture.content.slice(markerIndex + marker.length),
    targetOffset: markerIndex,
  };
}

async function prepareProject(comparisonCase: IRenameComparisonCase): Promise<IPreparedProject> {
  const projectPath = await mkdtemp(join(tmpdir(), `tsgo-lsp-rename-${comparisonCase.name}-`));
  let targetOffset: number | null = null;

  await writeFile(join(projectPath, "tsconfig.json"), comparisonCase.tsconfigContent, "utf8");

  for (const sourceFileFixture of comparisonCase.files) {
    const preparedFile = readPreparedFile(
      sourceFileFixture,
      comparisonCase.target.filePath,
      comparisonCase.target.marker,
    );
    if (preparedFile.targetOffset !== null) {
      targetOffset = preparedFile.targetOffset;
    }

    const absoluteFilePath = join(projectPath, sourceFileFixture.filePath);
    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, preparedFile.content, "utf8");
  }

  if (targetOffset === null) {
    throw new Error(`Missing target offset for ${comparisonCase.name}`);
  }

  return {
    projectPath,
    targetFilePath: join(projectPath, comparisonCase.target.filePath),
    targetOffset,
  };
}

export async function compareRenameBackends(tsgoExecutablePath: string): Promise<readonly IRenameCaseComparison[]> {
  const comparisons: IRenameCaseComparison[] = [];

  for (const comparisonCase of TS_RENAME_COMPARISON_CASES) {
    const preparedProject = await prepareProject(comparisonCase);

    try {
      const typescriptResult = readTypeScriptRenameResult(
        preparedProject.projectPath,
        preparedProject.targetFilePath,
        preparedProject.targetOffset,
        comparisonCase.target.newName,
      );
      const tsgoResult = await readTsgoRenameResult(
        preparedProject.projectPath,
        preparedProject.targetFilePath,
        preparedProject.targetOffset,
        comparisonCase.target.newName,
        tsgoExecutablePath,
      );

      comparisons.push({
        caseName: comparisonCase.name,
        description: comparisonCase.description,
        tsgoResult,
        typescriptResult,
      });
    } finally {
      await rm(preparedProject.projectPath, { force: true, recursive: true });
    }
  }

  return comparisons;
}
