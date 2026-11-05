import { afterAll, beforeAll, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const repositoryPath = resolve(import.meta.dir, "../../..");
let consumerPath = "";
let cliPath = "";

beforeAll(async () => {
  consumerPath = await mkdtemp(join(process.env.POLICY_CONSUMER_ROOT ?? tmpdir(), "policy-without-typescript-"));
  expect(Bun.spawnSync(["git", "init", "--quiet", consumerPath]).exitCode).toBe(0);
  const policyPath = join(consumerPath, "node_modules/@alexgorbatchev/typescript-ai-policy");
  await mkdir(policyPath, { recursive: true });
  const build = Bun.spawnSync(["just", "build", "--out-dir", join(policyPath, "dist")], { cwd: repositoryPath });
  expect(build.exitCode).toBe(0);
  await Bun.write(join(policyPath, "package.json"), Bun.file(join(repositoryPath, "package.json")));
  await Bun.write(
    join(consumerPath, "package.json"),
    `${JSON.stringify({ name: "consumer", type: "module" }, null, 2)}\n`,
  );
  await Bun.write(join(consumerPath, "example.ts"), 'export const message = "ready";\n');
  await Bun.write(
    join(consumerPath, "oxlint.config.ts"),
    'import createOxlintConfig from "@alexgorbatchev/typescript-ai-policy/oxlint-config";\n\nexport default createOxlintConfig();\n',
  );
  await Bun.write(
    join(consumerPath, "oxfmt.config.ts"),
    'import createOxfmtConfig from "@alexgorbatchev/typescript-ai-policy/oxfmt-config";\n\nexport default createOxfmtConfig();\n',
  );

  for (const dependency of ["commander", "minimatch", "package-manager-detector", "oxfmt", "oxlint"]) {
    await symlink(join(repositoryPath, "node_modules", dependency), join(consumerPath, "node_modules", dependency));
  }
  await mkdir(join(consumerPath, "node_modules/.bin"));
  for (const executable of ["oxfmt", "oxlint"]) {
    await symlink(
      join(repositoryPath, "node_modules/.bin", executable),
      join(consumerPath, "node_modules/.bin", executable),
    );
  }
  cliPath = join(policyPath, "dist/bin/typescript-ai-policy.js");
});

afterAll(async () => {
  await rm(consumerPath, { recursive: true, force: true });
});

function runCli(args: readonly string[]) {
  const result = Bun.spawnSync([process.execPath, cliPath, ...args], { cwd: consumerPath });
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
}

it.each([{ args: ["--help"] }, { args: ["fix-semantic", "--help"] }, { args: ["check"] }])(
  "runs %j without the optional TypeScript peer",
  ({ args }) => {
    expect(runCli(args)).toMatchObject({ exitCode: 0 });
  },
);

it("reports missing compiler dependencies only when semantic fixes are requested", () => {
  const require = createRequire(cliPath);
  expect(() => require.resolve("typescript/package.json")).toThrow();
  expect(() => require.resolve("@typescript/native/package.json")).toThrow();
  const result = runCli(["fix-semantic", consumerPath, "--dry-run"]);
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe("");
  const [, ...diagnosticLines] = result.stderr.split("\n");
  expect(diagnosticLines.join("\n")).toBe(
    'Missing peer dependency "typescript" or "@typescript/native". Install typescript 7+ (or use the @typescript/native alias) in the consuming project to use the semantic-fix CLI.\n',
  );
});

it("prints rule guidance without the optional TypeScript peer", () => {
  const result = runCli(["guidance", "--json"]);
  expect(result.exitCode).toBe(0);
  const guidance: unknown = JSON.parse(result.stdout);
  expect(guidance).toEqual(expect.arrayContaining([expect.objectContaining({ ruleName: expect.any(String) })]));
});

it("publishes FilenameStyle for typed consumers of the oxlint-config package entrypoint", async () => {
  const sourcePath = join(consumerPath, "filenameStyle.ts");
  await Bun.write(
    sourcePath,
    'import createOxlintConfig, { FilenameStyle } from "@alexgorbatchev/typescript-ai-policy/oxlint-config";\n' +
      'console.log(JSON.stringify(createOxlintConfig({ filenameStyle: FilenameStyle.DashCase }).rules?.["@alexgorbatchev/hook-export-location-convention"]));\n',
  );
  const typecheck = Bun.spawnSync(
    [join(repositoryPath, "node_modules/.bin/tsc"), "--noEmit", "--module", "NodeNext", "--skipLibCheck", sourcePath],
    { cwd: consumerPath },
  );
  expect({
    exitCode: typecheck.exitCode,
    stdout: typecheck.stdout.toString(),
    stderr: typecheck.stderr.toString(),
  }).toEqual({ exitCode: 0, stdout: "", stderr: "" });

  const runtime = Bun.spawnSync([process.execPath, sourcePath], { cwd: consumerPath });
  expect(runtime.exitCode).toBe(0);
  expect(runtime.stdout.toString()).toBe('["error",{"filenameStyle":"dash-case"}]\n');
});

it("applies semantic fixes using only the published package files", async () => {
  await mkdir(join(consumerPath, "node_modules/@typescript"));
  await symlink(join(repositoryPath, "node_modules/typescript"), join(consumerPath, "node_modules/typescript"));
  await symlink(
    join(repositoryPath, "node_modules/@typescript/native"),
    join(consumerPath, "node_modules/@typescript/native"),
  );
  const projectPath = join(consumerPath, "project");
  await mkdir(projectPath);
  await Bun.write(
    join(projectPath, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { module: "Preserve", moduleResolution: "bundler", noEmit: true } }),
  );
  await Bun.write(
    join(projectPath, "models.ts"),
    "export interface UserProfile { id: string; }\nexport function readId(profile: UserProfile): string { return profile.id; }\n",
  );

  try {
    expect(runCli(["fix-semantic", projectPath])).toMatchObject({ exitCode: 0 });
    expect(await Bun.file(join(projectPath, "models.ts")).text()).toBe(
      "export interface IUserProfile { id: string; }\nexport function readId(profile: IUserProfile): string { return profile.id; }\n",
    );
  } finally {
    await rm(join(consumerPath, "node_modules/typescript"));
    await rm(join(consumerPath, "node_modules/@typescript"), { recursive: true });
  }
});
