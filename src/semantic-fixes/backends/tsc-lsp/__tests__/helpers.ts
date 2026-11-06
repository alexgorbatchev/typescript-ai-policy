import assert from "node:assert/strict";
import { chmod, mkdtempDisposable } from "node:fs/promises";
import { join } from "node:path";
import { TscLspClient } from "../TscLspClient.ts";

export async function exchangeServerMessages(messages: readonly string[]): Promise<unknown> {
  const root = process.env.POLICY_TEST_ROOT;
  assert(root, "Run protocol tests through just test");
  await using workspace = await mkdtempDisposable(join(root, "lsp-wire-"));
  const executablePath = join(workspace.path, "language-server.ts");
  const source = await Bun.file(new URL("./fixtures/languageServer.ts", import.meta.url)).text();
  await Bun.write(executablePath, `#!${process.execPath}\n${source}`);
  await chmod(executablePath, 0o755);
  await Bun.write(join(workspace.path, "messages.json"), JSON.stringify(messages));
  const client = new TscLspClient({
    tscExecutablePath: executablePath,
    workspacePath: workspace.path,
  });
  try {
    await client.initialize();
    return await client.prepareRename(join(workspace.path, "file.ts"), { line: 0, character: 0 });
  } finally {
    await client.dispose();
  }
}
