import { expect, it } from "bun:test";
import { mkdtempDisposable } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readUpdatedContent } from "../applyTextEdits.ts";
import { readMovedFileTextEdits } from "../readMovedFileTextEdits.ts";

it.each([
  ['import value from "./value.ts";', 'import value from "../value.ts";'],
  ["import './setup.ts';", "import '../setup.ts';"],
  ['export { value } from "./value.ts";', 'export { value } from "../value.ts";'],
  ['export * from "./value.ts";', 'export * from "../value.ts";'],
  ['import value = require("./value.ts");', 'import value = require("../value.ts");'],
  ['type Value = import("./value.ts").Value;', 'type Value = import("../value.ts").Value;'],
  ['const value = import("./value.ts");', 'const value = import("../value.ts");'],
  ['const value = require("./value.ts");', 'const value = require("../value.ts");'],
  ["const value = import(`./value.ts`);", "const value = import(`../value.ts`);"],
  ["const value = require(`./value.ts`);", "const value = require(`../value.ts`);"],
])("preserves the module target and quoting when moving %s into a child directory", async (content, expected) => {
  await using directory = await mkdtempDisposable(join(process.env.POLICY_TEST_ROOT ?? tmpdir(), "moved-file-"));
  const sourceFilePath = join(directory.path, "entry.ts");
  const destinationFilePath = join(directory.path, "nested", "entry.ts");
  await Bun.write(sourceFilePath, content);

  const edits = readMovedFileTextEdits(sourceFilePath, destinationFilePath);

  expect(edits.map((edit) => edit.filePath)).toEqual([sourceFilePath]);
  expect(readUpdatedContent(sourceFilePath, content, edits)).toBe(expected);
  expect(await Bun.file(sourceFilePath).text()).toBe(content);
  expect(await Bun.file(destinationFilePath).exists()).toBe(false);
});

it("preserves package imports, computed module paths, ordinary calls, and unrelated strings", async () => {
  await using directory = await mkdtempDisposable(join(process.env.POLICY_TEST_ROOT ?? tmpdir(), "moved-file-"));
  const sourceFilePath = join(directory.path, "entry.ts");
  const content = [
    'import value from "package";',
    'export * from "@scope/package";',
    'import legacy = require("package");',
    'type Value = import("package").Value;',
    'const dynamic = import("package");',
    'const common = require("package");',
    'const computed = import("./" + name);',
    "const template = require(`./${name}`);",
    'readFile("./value.ts");',
    'loader.require("./value.ts");',
    "notify();",
    'const path = "./value.ts";',
    "export { path };",
    "import Alias = Namespace.Member;",
  ].join("\n");
  await Bun.write(sourceFilePath, content);

  expect(readMovedFileTextEdits(sourceFilePath, join(directory.path, "nested", "entry.ts"))).toEqual([]);
  expect(await Bun.file(sourceFilePath).text()).toBe(content);
});

it("does not edit relative specifiers when renaming within the same directory", async () => {
  await using directory = await mkdtempDisposable(join(process.env.POLICY_TEST_ROOT ?? tmpdir(), "moved-file-"));
  const sourceFilePath = join(directory.path, "entry.ts");
  const content = 'import "./setup.ts"; export * from "../shared.ts";';
  await Bun.write(sourceFilePath, content);

  expect(readMovedFileTextEdits(sourceFilePath, join(directory.path, "renamed.ts"))).toEqual([]);
});

it("orders same-line edits and retains relative directory targets when moving to the parent", async () => {
  await using directory = await mkdtempDisposable(join(process.env.POLICY_TEST_ROOT ?? tmpdir(), "moved-file-"));
  const sourceFilePath = join(directory.path, "nested", "entry.ts");
  const content = 'import "."; import "..";\nexport * from "../shared.ts";\n';
  await Bun.write(sourceFilePath, content);

  const edits = readMovedFileTextEdits(sourceFilePath, join(directory.path, "entry.ts"));

  expect(edits).toEqual([
    {
      filePath: sourceFilePath,
      newText: "./nested",
      start: { line: 0, character: 8 },
      end: { line: 0, character: 9 },
    },
    {
      filePath: sourceFilePath,
      newText: "./",
      start: { line: 0, character: 20 },
      end: { line: 0, character: 22 },
    },
    {
      filePath: sourceFilePath,
      newText: "./shared.ts",
      start: { line: 1, character: 15 },
      end: { line: 1, character: 27 },
    },
  ]);
  expect(readUpdatedContent(sourceFilePath, content, edits)).toBe(
    'import "./nested"; import "./";\nexport * from "./shared.ts";\n',
  );
});
