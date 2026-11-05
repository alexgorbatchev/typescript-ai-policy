import { expect, test } from "bun:test";
import { mkdtempDisposable } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readRuntimeSources } from "../readRuntimeSources.ts";

const TEST_ROOT = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");

test("uses runtime emission rather than filenames or optimization to build the inventory", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "runtime-inventory-"));
  const files = {
    "src/types.ts": "export const value = 1;",
    "src/dead.ts": "if (false) console.log('still runtime code');",
    "src/expression.ts": "0;",
    "src/effect.ts": "import './types.ts';",
    "src/inlineType.ts": "import { type Shape } from './erased.ts';",
    "src/erased.ts": "export interface Shape { value: string } export type Alias = Shape;",
    "src/typeImport.ts": "import type { Shape } from './erased.ts'; export type Copy = Shape;",
    "src/ambient.d.ts": "declare const value: string;",
    "src/__tests__/code.test.ts": "console.log('test');",
    "src/oxlint/test-support/helper.ts": "console.log('test support');",
    "scripts/tool.ts": "console.log('tool');",
  };
  for (const [path, source] of Object.entries(files)) await Bun.write(join(directory.path, path), source);
  expect(await readRuntimeSources(directory.path)).toEqual(
    ["dead.ts", "effect.ts", "expression.ts", "inlineType.ts", "types.ts"].map((path) =>
      join(directory.path, "src", path),
    ),
  );
});

test("fails closed when source cannot be transpiled", async () => {
  await using directory = await mkdtempDisposable(join(TEST_ROOT, "runtime-inventory-"));
  await Bun.write(join(directory.path, "src/broken.ts"), "export const = ;");
  await expect(readRuntimeSources(directory.path)).rejects.toThrow("Cannot inspect runtime source: src/broken.ts");
});
