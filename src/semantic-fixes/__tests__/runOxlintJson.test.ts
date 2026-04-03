import { expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { runOxlintJson } from "../runOxlintJson.ts";

type IFakeDiagnostic = {
  code: string;
  filename: string;
  labels: readonly {
    span: {
      column: number;
      length: number;
      line: number;
      offset: number;
    };
  }[];
  message: string;
  severity: string;
};

async function createFakeOxlintExecutable(diagnostics: readonly IFakeDiagnostic[]): Promise<string> {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "run-oxlint-json-test-"));
  const executablePath = join(tempDirectoryPath, "fake-oxlint.sh");
  const reportPath = join(tempDirectoryPath, "report.json");

  await writeFile(
    reportPath,
    JSON.stringify({
      diagnostics,
    }),
    "utf8",
  );
  await writeFile(
    executablePath,
    `#!/bin/sh
cat "$(dirname "$0")/report.json"
exit 1
`,
    "utf8",
  );
  await chmod(executablePath, 0o755);

  return executablePath;
}

function readFakeDiagnostic(index: number): IFakeDiagnostic {
  return {
    code: "@alexgorbatchev(interface-naming-convention)",
    filename: `file-${String(index)}.ts`,
    labels: [
      {
        span: {
          column: 1,
          length: 11,
          line: 1,
          offset: 0,
        },
      },
    ],
    message: `Rename interface UserProfile${String(index)} to match the policy. ${"x".repeat(1200)}`,
    severity: "error",
  };
}

it("reads large Oxlint JSON output without spawnSync maxBuffer failures", async () => {
  const diagnostics = Array.from({ length: 3000 }, (_, index) => readFakeDiagnostic(index));
  const executablePath = await createFakeOxlintExecutable(diagnostics);

  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused-config",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });

    expect(result.length).toBe(3000);
    expect(result[0]).toEqual({
      code: "@alexgorbatchev/interface-naming-convention",
      filename: "file-0.ts",
      labels: [
        {
          span: {
            column: 1,
            length: 11,
            line: 1,
            offset: 0,
          },
        },
      ],
      message: `Rename interface UserProfile0 to match the policy. ${"x".repeat(1200)}`,
      severity: "error",
    });
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});
