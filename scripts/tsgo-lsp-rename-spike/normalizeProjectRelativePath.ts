import { relative } from "node:path";

export function normalizeProjectRelativePath(projectPath: string, filePath: string): string {
  return relative(projectPath, filePath).split("\\").join("/");
}
