import { expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createInterfaceNamingConventionSemanticFixProvider } from "../createInterfaceNamingConventionSemanticFixProvider.ts";

it("creates a rename-symbol operation for a repository-owned interface diagnostic", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "interface-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export interface UserProfile {
  id: string;
}
`,
    "utf8",
  );

  try {
    const provider = createInterfaceNamingConventionSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/interface-naming-convention",
        filename: "models.ts",
        labels: [
          {
            span: {
              column: 18,
              length: 11,
              line: 1,
              offset: 17,
            },
          },
        ],
        message: "Rename interface UserProfile to match the policy.",
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toEqual({
      filePath,
      id: `@alexgorbatchev/interface-naming-convention:${filePath}:0:17:IUserProfile`,
      kind: "rename-symbol",
      newName: "IUserProfile",
      position: {
        character: 17,
        line: 0,
      },
      ruleCode: "@alexgorbatchev/interface-naming-convention",
      symbolName: "UserProfile",
    });
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});

it("normalizes malformed I-prefixed interface names to PascalCase", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "interface-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export interface IuserProfile {
  id: string;
}
`,
    "utf8",
  );

  try {
    const provider = createInterfaceNamingConventionSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/interface-naming-convention",
        filename: filePath,
        labels: [
          {
            span: {
              column: 18,
              length: 12,
              line: 1,
              offset: 17,
            },
          },
        ],
        message: "Rename interface IuserProfile to match the policy.",
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toEqual({
      filePath,
      id: `@alexgorbatchev/interface-naming-convention:${filePath}:0:17:IUserProfile`,
      kind: "rename-symbol",
      newName: "IUserProfile",
      position: {
        character: 17,
        line: 0,
      },
      ruleCode: "@alexgorbatchev/interface-naming-convention",
      symbolName: "IuserProfile",
    });
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});

it("returns null when the interface name cannot be normalized safely", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "interface-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export interface user_profile {
  id: string;
}
`,
    "utf8",
  );

  try {
    const provider = createInterfaceNamingConventionSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/interface-naming-convention",
        filename: filePath,
        labels: [
          {
            span: {
              column: 18,
              length: 12,
              line: 1,
              offset: 17,
            },
          },
        ],
        message: "Rename interface user_profile to match the policy.",
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toBeNull();
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});
