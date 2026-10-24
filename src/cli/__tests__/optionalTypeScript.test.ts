import { afterAll, beforeAll, expect, it } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryPath = resolve(import.meta.dir, "../../..");
let consumerPath = "";
let cliPath = "";

beforeAll(async () => {
  const build = Bun.spawnSync([process.execPath, "run", "build"], { cwd: repositoryPath });
  expect(build.exitCode).toBe(0);

  consumerPath = await mkdtemp(join(tmpdir(), "policy-without-typescript-"));
  const policyPath = join(consumerPath, "node_modules/@alexgorbatchev/typescript-ai-policy");
  await mkdir(policyPath, { recursive: true });
  await cp(join(repositoryPath, "dist"), join(policyPath, "dist"), { recursive: true });
  await Bun.write(join(policyPath, "package.json"), Bun.file(join(repositoryPath, "package.json")));
  await Bun.write(
    join(consumerPath, "package.json"),
    `${JSON.stringify({ name: "consumer", type: "module" }, null, 2)}\n`,
  );
  await Bun.write(join(consumerPath, "example.ts"), 'export const message = "ready";\n');

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
