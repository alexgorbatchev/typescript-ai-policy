import { expect, it } from "bun:test";
import { join } from "node:path";
import { createProgram, getPreEmitDiagnostics, ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import { createFixtureRepo } from "../test-support/createFixtureRepo.ts";
import { expectLintTargetFailure, expectLintTargetSuccess } from "../test-support/expectLintTargetResult.ts";
import { runLintTarget } from "../test-support/runLintTarget.ts";

it("accepts constant-derived unions, aliases and shadowing with the complete policy and erases the type module", async () => {
  using repository = createFixtureRepo("no-type-imports-from-constants/value-queries-valid");
  expectLintTargetSuccess(runLintTarget(repository.path));

  const program = createProgram([join(repository.path, "src/index.ts")], {
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Bundler,
    target: ScriptTarget.ESNext,
    verbatimModuleSyntax: true,
    strict: true,
    types: [],
    skipLibCheck: true,
  });
  expect(getPreEmitDiagnostics(program)).toEqual([]);
  const output = new Map<string, string>();
  const emit = program.emit(undefined, (path, text) => output.set(path, text));
  expect(emit.emitSkipped).toBe(false);
  expect(emit.diagnostics).toEqual([]);
  expect(output.get(join(repository.path, "src/types.js"))).toBe("export {};\n");
  expect(output.get(join(repository.path, "src/aliases.js"))).toBe(
    'import { COMMENT_KIND } from "./constants.js";\nexport function readCommentKind(severity) {\n    const kind = COMMENT_KIND.TODO;\n    return kind;\n}\n',
  );

  const source = await Bun.file(join(repository.path, "src/types.ts")).text();
  const transpiler = new Bun.Transpiler({
    loader: "ts",
    tsconfig: JSON.stringify({ compilerOptions: { verbatimModuleSyntax: true } }),
  });
  expect(transpiler.transformSync(source)).toBe("");
  const ordinaryImportSource = source.replace("import type {", "import {");
  expect(transpiler.transformSync(ordinaryImportSource)).toBe(
    'import { COMMENT_KIND, EXPORT_KIND, RULE_NAME, RULE_SEVERITY, SEVERITY, USAGE_SOURCE } from "./constants.js";\n',
  );
  await Bun.write(join(repository.path, "src/types.ts"), ordinaryImportSource);
  const ordinaryImportProgram = createProgram(program.getRootFileNames(), program.getCompilerOptions());
  expect(getPreEmitDiagnostics(ordinaryImportProgram)).toEqual([]);
  const ordinaryOutput = new Map<string, string>();
  expect(ordinaryImportProgram.emit(undefined, (path, text) => ordinaryOutput.set(path, text)).emitSkipped).toBe(false);
  expect(ordinaryOutput.get(join(repository.path, "src/types.js"))).toBe(
    'import { COMMENT_KIND, EXPORT_KIND, RULE_NAME, RULE_SEVERITY, SEVERITY, USAGE_SOURCE } from "./constants.js";\n',
  );
});

it("keeps actual type imports rejected alongside a permitted constant query", () => {
  using repository = createFixtureRepo("no-type-imports-from-constants/declared-types-invalid");
  expectLintTargetFailure(runLintTarget(repository.path), [
    {
      column: 8,
      filePath: "src/constants.ts",
      line: 1,
      message:
        'Move exported type "SomeTypeAlias" out of this "constants" file and into a sibling "types.ts" module. "constants.ts" must export runtime values only.',
      ruleId: "@alexgorbatchev(no-type-exports-from-constants)",
      severity: "error",
    },
    {
      column: 8,
      filePath: "src/constants.ts",
      line: 2,
      message:
        'Move exported type "ISomeType" out of this "constants" file and into a sibling "types.ts" module. "constants.ts" must export runtime values only.',
      ruleId: "@alexgorbatchev(no-type-exports-from-constants)",
      severity: "error",
    },
    {
      column: 15,
      filePath: "src/types.ts",
      line: 1,
      message:
        "Import declared types from their owning types module. Use an erased named import from constants only when every reference is a typeof value query.",
      ruleId: "@alexgorbatchev(no-type-imports-from-constants)",
      severity: "error",
    },
    {
      column: 30,
      filePath: "src/types.ts",
      line: 1,
      message:
        "Import declared types from their owning types module. Use an erased named import from constants only when every reference is a typeof value query.",
      ruleId: "@alexgorbatchev(no-type-imports-from-constants)",
      severity: "error",
    },
  ]);
});

it("requires compiler validation of query targets and keeps constants declaration ownership enforced", () => {
  using repository = createFixtureRepo("no-type-imports-from-constants/invalid-value-queries");
  expectLintTargetFailure(runLintTarget(repository.path), [
    {
      column: 8,
      filePath: "src/constants.ts",
      line: 1,
      message:
        'Move exported type "SomeTypeAlias" out of this "constants" file and into a sibling "types.ts" module. "constants.ts" must export runtime values only.',
      ruleId: "@alexgorbatchev(no-type-exports-from-constants)",
      severity: "error",
    },
    {
      column: 8,
      filePath: "src/constants.ts",
      line: 2,
      message:
        'Move exported type "ISomeType" out of this "constants" file and into a sibling "types.ts" module. "constants.ts" must export runtime values only.',
      ruleId: "@alexgorbatchev(no-type-exports-from-constants)",
      severity: "error",
    },
  ]);
  const program = createProgram([join(repository.path, "src/types.ts")], {
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Bundler,
    target: ScriptTarget.ESNext,
    verbatimModuleSyntax: true,
    strict: true,
    types: [],
    skipLibCheck: true,
    noEmit: true,
  });
  expect(getPreEmitDiagnostics(program).map(({ code, messageText }) => ({ code, messageText }))).toEqual([
    { code: 2693, messageText: "'SomeTypeAlias' only refers to a type, but is being used as a value here." },
    { code: 2693, messageText: "'ISomeType' only refers to a type, but is being used as a value here." },
  ]);
});

it("rejects a local type re-export even when the same imported constant has a typeof query", () => {
  using repository = createFixtureRepo("no-type-imports-from-constants/local-type-reexport-invalid");
  expectLintTargetFailure(runLintTarget(repository.path), [
    {
      column: 15,
      filePath: "src/types.ts",
      line: 1,
      message:
        "Import declared types from their owning types module. Use an erased named import from constants only when every reference is a typeof value query.",
      ruleId: "@alexgorbatchev(no-type-imports-from-constants)",
      severity: "error",
    },
  ]);
});
