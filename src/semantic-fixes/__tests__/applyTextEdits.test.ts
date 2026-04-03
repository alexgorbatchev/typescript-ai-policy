import { expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyTextEdits } from "../applyTextEdits.ts";

it("prefers the narrowest overlapping edit when tsgo returns a redundant wider rename span with the same replacement", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "apply-text-edits-test-"));
  const filePath = join(projectPath, "bundlers.ts");

  try {
    await writeFile(
      filePath,
      `export function createPluginBundlerPresets(input: PluginBundlerPresetInput = {}): PluginBundlerPresets {
  return input as unknown as PluginBundlerPresets;
}
`,
      "utf8",
    );

    applyTextEdits([
      {
        end: { character: 74, line: 0 },
        filePath,
        newText: "IPluginBundlerPresetInput",
        start: { character: 50, line: 0 },
      },
      {
        end: { character: 79, line: 0 },
        filePath,
        newText: "IPluginBundlerPresetInput",
        start: { character: 50, line: 0 },
      },
      {
        end: { character: 102, line: 0 },
        filePath,
        newText: "IPluginBundlerPresets",
        start: { character: 82, line: 0 },
      },
      {
        end: { character: 49, line: 1 },
        filePath,
        newText: "IPluginBundlerPresets",
        start: { character: 29, line: 1 },
      },
    ]);

    expect(await readFile(filePath, "utf8"))
      .toBe(`export function createPluginBundlerPresets(input: IPluginBundlerPresetInput = {}): IPluginBundlerPresets {
  return input as unknown as IPluginBundlerPresets;
}
`);
  } finally {
    await rm(projectPath, { force: true, recursive: true });
  }
});
