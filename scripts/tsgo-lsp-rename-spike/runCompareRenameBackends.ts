import { join } from "node:path";
import { compareRenameBackends } from "./compareRenameBackends.ts";

const tsgoExecutablePath = join(process.cwd(), "node_modules/.bin/tsgo");
const comparisons = await compareRenameBackends(tsgoExecutablePath);

console.log(JSON.stringify(comparisons, null, 2));
