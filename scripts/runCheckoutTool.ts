import { execa } from "execa";
import { readCheckoutFiles } from "./readCheckoutFiles.ts";

export async function runCheckoutTool(root: string, args: readonly string[]): Promise<number> {
  const [tool, ...options] = args;
  if (tool !== "oxlint" && tool !== "oxfmt") throw new Error("Expected the oxlint or oxfmt checkout tool");
  const files = await readCheckoutFiles(root);
  if (files.length === 0) throw new Error("No regular files belong to this checkout");
  const result = await execa(process.execPath, ["run", "--bun", tool, ...options, "--", ...files], {
    cwd: root,
    stdio: "inherit",
    killDescendants: true,
    reject: false,
  });
  return result.exitCode ?? 1;
}

if (import.meta.main) {
  try {
    process.exitCode = await runCheckoutTool(process.cwd(), process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
