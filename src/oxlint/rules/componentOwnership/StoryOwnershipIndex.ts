import { existsSync, readdirSync, realpathSync } from "node:fs";
import { basename, join } from "node:path";
import { isRuntimeComponentOwnershipFile, readComponentOwnershipRole } from "./componentOwnershipRole.ts";
import { ModuleBindingGraph } from "./ModuleBindingGraph.ts";
import { readBindingPath } from "./readBindingPath.ts";
import { readDefaultExportDeclaration, readTopLevelVariableDeclarator } from "./storyMetaBindings.ts";

export class StoryOwnershipIndex {
  private readonly graph: ModuleBindingGraph;

  constructor(filename: string, source: string) {
    this.graph = new ModuleBindingGraph(filename, source);
  }

  readOwner(filename: string): string | null {
    const role = readComponentOwnershipRole(filename);
    if (!role?.rolePath.slice(0, -1).includes("stories") || !filename.endsWith(".stories.tsx")) return null;
    const program = this.graph.readProgram(filename);
    if (!program) return null;
    const defaultExport = readDefaultExportDeclaration(program);
    if (defaultExport?.declaration.type !== "Identifier") return null;
    const binding = readTopLevelVariableDeclarator(program, defaultExport.declaration.name);
    if (binding?.declaration.kind !== "const" || binding.declarator.init?.type !== "ObjectExpression") return null;
    const type = binding.declarator.id.typeAnnotation?.typeAnnotation;
    if (
      type?.type !== "TSTypeReference" ||
      type.typeName.type !== "Identifier" ||
      type.typeName.name !== "Meta" ||
      type.typeArguments?.params.length !== 1
    )
      return null;
    const query = type.typeArguments.params[0];
    if (query?.type !== "TSTypeQuery") return null;
    const names = readBindingPath(query.exprName);
    const component = this.graph.readProperty(filename, binding.declarator.init, "component");
    if (!names || component.kind !== "value") return null;
    const typedOwner = this.graph.resolveBinding(filename, names);
    const valueOwner = this.graph.resolveExpression(filename, component.expression);
    if (
      !typedOwner ||
      !valueOwner ||
      typedOwner.filename !== valueOwner.filename ||
      typedOwner.name !== valueOwner.name
    )
      return null;
    if (!isRuntimeComponentOwnershipFile(typedOwner.filename)) return null;
    const ownerRole = readComponentOwnershipRole(typedOwner.filename);
    if (ownerRole?.areaPath !== role.areaPath || ownerRole.packagePath !== role.packagePath) return null;
    return basename(filename, ".stories.tsx") === basename(typedOwner.filename, ".tsx") ? typedOwner.filename : null;
  }

  hasStory(filename: string): boolean {
    const role = readComponentOwnershipRole(filename);
    if (!role) return false;
    const expectedName = `${basename(filename, ".tsx")}.stories.tsx`;
    const candidates = this.findStories(role.areaPath, expectedName);
    for (const candidate of candidates) {
      const owner = this.readOwner(candidate);
      if (owner && realpathSync(owner) === realpathSync(filename)) return true;
    }
    return false;
  }

  private *findStories(directory: string, expectedName: string): Generator<string> {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isFile() && entry.name === expectedName) yield path;
      else if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !["node_modules", "__tests__", "hooks", "fixtures", "__fixtures__"].includes(entry.name) &&
        !existsSync(join(path, "package.json"))
      ) {
        yield* this.findStories(path, expectedName);
      }
    }
  }
}
