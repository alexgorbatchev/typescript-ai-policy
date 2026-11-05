import { resolve } from "node:path";
import ts from "typescript";

export async function readRuntimeSources(root: string): Promise<string[]> {
  const sources: string[] = [];
  const glob = new Bun.Glob("src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}");
  for await (const path of glob.scan({ cwd: root })) {
    if (path.includes("/__tests__/") || path.startsWith("src/oxlint/test-support/") || /\.d\.[cm]?ts$/u.test(path)) {
      continue;
    }
    const sourcePath = resolve(root, path);
    const result = ts.transpileModule(await Bun.file(sourcePath).text(), {
      fileName: sourcePath,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.Preserve,
        moduleDetection: ts.ModuleDetectionKind.Force,
        verbatimModuleSyntax: true,
        removeComments: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    if (result.diagnostics?.length) throw new Error(`Cannot inspect runtime source: ${path}`);
    const output = ts.createSourceFile("output.js", result.outputText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    const erased = output.statements.every(
      (statement) =>
        ts.isEmptyStatement(statement) ||
        (ts.isExportDeclaration(statement) &&
          !statement.moduleSpecifier &&
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause) &&
          statement.exportClause.elements.length === 0),
    );
    if (!erased) sources.push(sourcePath);
  }
  return sources.sort();
}
