import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export function resolveModulePath(filename: string): string {
  try {
    return realpathSync.native(filename);
  } catch {
    // A linted editor buffer can have a filename before its file exists on disk.
    return resolve(filename);
  }
}
