import assert from "node:assert/strict";
import { chmod, mkdtempDisposable } from "node:fs/promises";
import { join } from "node:path";
import { TscLspClient } from "../TscLspClient.ts";

type LanguageServerAction<T> = (client: TscLspClient, filePath: string) => Promise<T>;

export async function withLanguageServer<T>(
  responseMessages: readonly (readonly string[])[],
  run: LanguageServerAction<T>,
  messages: readonly string[] = [],
): Promise<T> {
  const root = process.env.POLICY_TEST_ROOT;
  assert(root, "Run protocol tests through just test");
  await using workspace = await mkdtempDisposable(join(root, "lsp-wire-"));
  const executablePath = join(workspace.path, "language-server.ts");
  const source = await Bun.file(new URL("./fixtures/languageServer.ts", import.meta.url)).text();
  await Bun.write(executablePath, `#!${process.execPath}\n${source}`);
  await chmod(executablePath, 0o755);
  await Bun.write(join(workspace.path, "messages.json"), JSON.stringify(messages));
  await Bun.write(join(workspace.path, "responses.json"), JSON.stringify(responseMessages));
  const client = new TscLspClient({
    tscExecutablePath: executablePath,
    workspacePath: workspace.path,
  });
  try {
    await client.initialize();
    return await run(client, join(workspace.path, "file.ts"));
  } finally {
    await client.dispose();
  }
}

export function exchangeServerMessages(messages: readonly string[]): Promise<unknown> {
  return withLanguageServer(
    [],
    (client, filePath) => client.prepareRename(filePath, { line: 0, character: 0 }),
    messages,
  );
}
