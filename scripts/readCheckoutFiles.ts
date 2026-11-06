import { execa } from "execa";
import { lstat } from "node:fs/promises";
import { join } from "node:path";

async function isRegularCheckoutFile(root: string, relativePath: string): Promise<boolean> {
  let currentPath = root;
  let isFile = false;
  for (const part of relativePath.split("/")) {
    currentPath = join(currentPath, part);
    try {
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are unsupported in checkout checks: ${relativePath}`);
      }
      isFile = entry.isFile();
    } catch (error) {
      if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
        return false;
      }
      throw error;
    }
  }
  return isFile;
}

export async function readCheckoutFiles(root: string): Promise<string[]> {
  const prefix = await execa("git", ["rev-parse", "--show-prefix"], { cwd: root });
  if (prefix.stdout !== "") throw new Error("Run checkout checks from the Git checkout root");
  const result = await execa("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--deduplicate", "-z"], {
    cwd: root,
    stripFinalNewline: false,
  });
  const files: string[] = [];
  for (const relativePath of result.stdout.split("\0").filter(Boolean)) {
    if (await isRegularCheckoutFile(root, relativePath)) files.push(`./${relativePath}`);
  }
  return files.toSorted();
}
