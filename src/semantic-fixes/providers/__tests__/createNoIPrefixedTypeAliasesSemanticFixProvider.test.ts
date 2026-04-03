import { expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createNoIPrefixedTypeAliasesSemanticFixProvider } from "../createNoIPrefixedTypeAliasesSemanticFixProvider.ts";

it("creates a rename-symbol operation for an I-prefixed type alias diagnostic", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "type-alias-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export type IUserProfile = {
  id: string;
};
`,
    "utf8",
  );

  try {
    const provider = createNoIPrefixedTypeAliasesSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/no-i-prefixed-type-aliases",
        filename: "models.ts",
        labels: [
          {
            span: {
              column: 13,
              length: 12,
              line: 1,
              offset: 12,
            },
          },
        ],
        message: 'Rename type alias "IUserProfile" to remove the "I" prefix.',
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toEqual({
      filePath,
      id: `@alexgorbatchev/no-i-prefixed-type-aliases:${filePath}:0:12:UserProfile`,
      kind: "rename-symbol",
      newName: "UserProfile",
      position: {
        character: 12,
        line: 0,
      },
      ruleCode: "@alexgorbatchev/no-i-prefixed-type-aliases",
      symbolName: "IUserProfile",
    });
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});

it("falls back to the diagnostic line and column when the reported offset misses the type alias name", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "type-alias-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export type IURLConfig = {
  href: string;
};
`,
    "utf8",
  );

  try {
    const provider = createNoIPrefixedTypeAliasesSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/no-i-prefixed-type-aliases",
        filename: filePath,
        labels: [
          {
            span: {
              column: 13,
              length: 10,
              line: 1,
              offset: 28,
            },
          },
        ],
        message: 'Rename type alias "IURLConfig" to remove the "I" prefix.',
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toEqual({
      filePath,
      id: `@alexgorbatchev/no-i-prefixed-type-aliases:${filePath}:0:12:URLConfig`,
      kind: "rename-symbol",
      newName: "URLConfig",
      position: {
        character: 12,
        line: 0,
      },
      ruleCode: "@alexgorbatchev/no-i-prefixed-type-aliases",
      symbolName: "IURLConfig",
    });
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});

it("returns null when the diagnostic does not resolve to a type alias declaration name", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "type-alias-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "models.ts");

  await writeFile(
    filePath,
    `export type IUserProfile = {
  id: string;
};
`,
    "utf8",
  );

  try {
    const provider = createNoIPrefixedTypeAliasesSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/no-i-prefixed-type-aliases",
        filename: filePath,
        labels: [
          {
            span: {
              column: 1,
              length: 1,
              line: 99,
              offset: 999,
            },
          },
        ],
        message: 'Rename type alias "IUserProfile" to remove the "I" prefix.',
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
