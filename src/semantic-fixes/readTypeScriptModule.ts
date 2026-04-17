import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let cachedTypeScriptModule: typeof import("typescript") | null = null;

export function readTypeScriptModule(): typeof import("typescript") {
  if (cachedTypeScriptModule) {
    return cachedTypeScriptModule;
  }

  try {
    const typescriptModule: typeof import("typescript") = require("typescript");
    cachedTypeScriptModule = typescriptModule;
    return typescriptModule;
  } catch {
    throw new Error(
      'Missing optional peer dependency "typescript". Install typescript in the consuming project to use the semantic-fix CLI.',
    );
  }
}
