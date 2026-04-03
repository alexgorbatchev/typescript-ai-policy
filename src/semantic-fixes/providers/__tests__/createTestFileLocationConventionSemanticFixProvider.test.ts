import { expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTestFileLocationConventionSemanticFixProvider } from "../createTestFileLocationConventionSemanticFixProvider.ts";

it("creates a move-file operation for a misplaced .test.ts file", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "test-file-location-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "widgets", "SignalPanel.test.ts");

  await mkdir(join(tempDirectoryPath, "widgets"), { recursive: true });
  await writeFile(
    filePath,
    `import { test } from "bun:test";

test("renders", () => {});
`,
    "utf8",
  );

  try {
    const provider = createTestFileLocationConventionSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/test-file-location-convention",
        filename: filePath,
        labels: [
          {
            span: {
              column: 1,
              length: 57,
              line: 1,
              offset: 0,
            },
          },
        ],
        message: 'Move this test file under a "__tests__/" directory.',
        severity: "error",
      },
      {
        targetDirectoryPath: tempDirectoryPath,
      },
    );

    expect(operation).toEqual({
      filePath,
      id: `@alexgorbatchev/test-file-location-convention:${filePath}:${join(tempDirectoryPath, "widgets", "__tests__", "SignalPanel.test.ts")}`,
      kind: "move-file",
      newFilePath: join(tempDirectoryPath, "widgets", "__tests__", "SignalPanel.test.ts"),
      ruleCode: "@alexgorbatchev/test-file-location-convention",
    });
  } finally {
    await rm(tempDirectoryPath, { force: true, recursive: true });
  }
});

it("returns null for invalid test filenames that still need a separate rename fix", async () => {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "test-file-location-fix-provider-test-"));
  const filePath = join(tempDirectoryPath, "widgets", "SignalPanel.spec.ts");

  await mkdir(join(tempDirectoryPath, "widgets"), { recursive: true });
  await writeFile(
    filePath,
    `import { test } from "bun:test";

test("renders", () => {});
`,
    "utf8",
  );

  try {
    const provider = createTestFileLocationConventionSemanticFixProvider();
    const operation = provider.createOperation(
      {
        code: "@alexgorbatchev/test-file-location-convention",
        filename: filePath,
        labels: [
          {
            span: {
              column: 1,
              length: 57,
              line: 1,
              offset: 0,
            },
          },
        ],
        message: 'Move this test file under a "__tests__/" directory.',
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
