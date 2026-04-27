import { expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { runOxlintJson } from "../runOxlintJson.ts";

type FakeDiagnostic = {
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

async function createFakeOxlintExecutable(diagnostics: readonly FakeDiagnostic[]): Promise<string> {
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

async function createCustomFakeOxlintExecutable(script: string): Promise<string> {
  const tempDirectoryPath = await mkdtemp(join(tmpdir(), "run-oxlint-json-test-"));
  const executablePath = join(tempDirectoryPath, "fake-oxlint.sh");

  await writeFile(executablePath, script, "utf8");
  await chmod(executablePath, 0o755);

  return executablePath;
}

function readFakeDiagnostic(index: number): FakeDiagnostic {
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

it("returns empty array for empty stdout", async () => {
  const executablePath = await createCustomFakeOxlintExecutable(`#!/bin/sh\nexit 0\n`);
  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });
    expect(result).toEqual([]);
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});

it("returns empty array for invalid JSON", async () => {
  const executablePath = await createCustomFakeOxlintExecutable(`#!/bin/sh\necho "not json"\nexit 0\n`);
  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });
    expect(result).toEqual([]);
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});

it("parses line-delimited JSON output", async () => {
  const diagnostic = readFakeDiagnostic(1);
  const executablePath = await createCustomFakeOxlintExecutable(`#!/bin/sh
echo '{"message": "foo"}'
echo '${JSON.stringify(diagnostic)}'
echo '{"diagnostics": [${JSON.stringify(diagnostic)}]}'
exit 1
`);
  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });
    expect(result.length).toBe(2);
    expect(result[0]?.filename).toBe("file-1.ts");
    expect(result[1]?.filename).toBe("file-1.ts");
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});

it("handles exit code 2 without throwing", async () => {
  const diagnostic = readFakeDiagnostic(1);
  const executablePath = await createCustomFakeOxlintExecutable(`#!/bin/sh
echo '{"diagnostics": [${JSON.stringify(diagnostic)}]}'
exit 2
`);
  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });
    expect(result.length).toBe(1);
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});

it("filters out invalid diagnostic objects", async () => {
  const executablePath = await createCustomFakeOxlintExecutable(`#!/bin/sh
echo '{"diagnostics": [{"message": "foo"}, null, "string", {"code": "1", "filename": "1", "labels": [], "message": "m", "severity": "error"}]}'
exit 0
`);
  try {
    const result = await runOxlintJson({
      oxlintConfigPath: "unused",
      oxlintExecutablePath: executablePath,
      targetDirectoryPath: dirname(executablePath),
    });
    expect(result.length).toBe(1);
    expect(result[0]?.code).toBe("1");
  } finally {
    await rm(dirname(executablePath), { force: true, recursive: true });
  }
});
