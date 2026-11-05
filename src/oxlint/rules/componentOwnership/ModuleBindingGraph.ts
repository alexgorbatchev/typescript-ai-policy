import type { Expression, ObjectExpression, Program } from "oxc-parser";
import type { ExportResolution, ModuleSymbol, ParsedModule, StaticProperty } from "./types.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSync } from "oxc-parser";
import { ResolverFactory } from "oxc-resolver";
import { readBindingPath } from "./readBindingPath.ts";
import { readModuleBindings } from "./readModuleBindings.ts";

type GuardedOperation<T> = () => T;

export class ModuleBindingGraph {
  private readonly currentFilename: string;
  private readonly currentSource: string;
  private readonly modules = new Map<string, ParsedModule | null>();
  private readonly active = new Set<string>();
  private readonly resolver = new ResolverFactory({
    tsconfig: "auto",
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mts", ".mjs", ".cts", ".cjs", ".json"],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    conditionNames: ["import", "node", "default"],
    nodePath: false,
  });

  constructor(currentFilename: string, currentSource: string) {
    this.currentFilename = currentFilename;
    this.currentSource = currentSource;
  }

  readProgram(filename: string): Program | null {
    return this.readModule(filename)?.program ?? null;
  }

  resolveImport(filename: string, specifier: string): string | null {
    try {
      return this.resolver.resolveFileSync(filename, specifier).path ?? null;
    } catch {
      return null;
    }
  }

  resolveBinding(filename: string, names: readonly string[]): ModuleSymbol | null {
    return this.guard(`binding:${filename}:${JSON.stringify(names)}`, () => {
      const [name, ...members] = names;
      if (!name) return null;
      const binding = this.readModule(filename)?.bindings.get(name);
      if (!binding || binding.kind === "unknown") return null;
      if (binding.kind === "import") {
        const resolution = this.resolveRemote(filename, binding.source, [...binding.names, ...members]);
        return resolution === "unresolved" ? null : resolution;
      }
      if (binding.kind === "runtime") return members.length === 0 ? { filename, name } : null;
      const initializer = binding.declarator.init;
      if (!initializer) return null;
      if (members.length > 0) return this.resolveMember(filename, initializer, members);
      const path = readBindingPath(initializer);
      return path ? this.resolveBinding(filename, path) : { filename, name };
    });
  }

  resolveExpression(filename: string, expression: Expression): ModuleSymbol | null {
    const names = readBindingPath(expression);
    if (names) return this.resolveBinding(filename, names);
    if (
      [
        "ArrowFunctionExpression",
        "FunctionExpression",
        "FunctionDeclaration",
        "ClassExpression",
        "ClassDeclaration",
        "CallExpression",
      ].includes(expression.type)
    ) {
      return { filename, name: `expression:${expression.start}` };
    }
    return null;
  }

  readProperty(filename: string, expression: Expression, name: string): StaticProperty {
    const result = this.guard(`property:${filename}:${expression.start}:${name}`, () => {
      if (expression.type === "ObjectExpression") return this.readObjectProperty(filename, expression, name);
      if (expression.type === "Identifier") {
        const binding = this.readModule(filename)?.bindings.get(expression.name);
        if (binding?.kind === "const" && binding.declarator.init)
          return this.readProperty(filename, binding.declarator.init, name);
      }
      return { kind: "unknown" } satisfies StaticProperty;
    });
    return result ?? { kind: "unknown" };
  }

  private readModule(filename: string): ParsedModule | null {
    if (this.modules.has(filename)) return this.modules.get(filename) ?? null;
    let module: ParsedModule | null = null;
    try {
      const source =
        resolve(filename) === resolve(this.currentFilename) ? this.currentSource : readFileSync(filename, "utf8");
      const parsed = parseSync(filename, source, { astType: "ts", preserveParens: false, showSemanticErrors: true });
      if (parsed.errors.length === 0) module = readModuleBindings(parsed.program);
    } catch {
      // Unreadable and invalid counterpart modules cannot establish ownership.
    }
    this.modules.set(filename, module);
    return module;
  }

  private resolveRemote(filename: string, source: string, names: readonly string[]): ExportResolution {
    const target = this.resolveImport(filename, source);
    return target ? this.resolveExport(target, names) : "unresolved";
  }

  private resolveExport(filename: string, names: readonly string[]): ExportResolution {
    return this.guard(`export:${filename}:${JSON.stringify(names)}`, () => {
      const [name, ...members] = names;
      const module = this.readModule(filename);
      if (!name) return null;
      if (!module) return "unresolved";
      const exported = module.exports.get(name);
      if (exported?.kind === "local") return this.resolveBinding(filename, [exported.name, ...members]) ?? "unresolved";
      if (exported?.kind === "remote")
        return this.resolveRemote(filename, exported.source, [...exported.names, ...members]) ?? "unresolved";
      if (exported?.kind === "expression")
        return (
          (members.length > 0
            ? this.resolveMember(filename, exported.expression, members)
            : this.resolveExpression(filename, exported.expression)) ?? "unresolved"
        );
      if (name === "default") return null;
      let result: ModuleSymbol | null = null;
      for (const source of module.starExports) {
        const candidate = this.resolveRemote(filename, source, names);
        if (candidate === "unresolved") return "unresolved";
        if (!candidate) continue;
        if (result && (candidate.filename !== result.filename || candidate.name !== result.name)) return "unresolved";
        result = candidate;
      }
      return result;
    });
  }

  private resolveMember(filename: string, expression: Expression, members: readonly string[]): ModuleSymbol | null {
    const path = readBindingPath(expression);
    if (path) return this.resolveBinding(filename, [...path, ...members]);
    const [name, ...rest] = members;
    if (!name) return this.resolveExpression(filename, expression);
    const property = this.readProperty(filename, expression, name);
    if (property.kind !== "value") return null;
    if (rest.length > 0) return this.resolveMember(filename, property.expression, rest);
    return this.resolveExpression(filename, property.expression);
  }

  private readObjectProperty(filename: string, expression: ObjectExpression, name: string): StaticProperty {
    let result: StaticProperty = { kind: "absent" };
    for (const property of expression.properties) {
      if (property.type === "SpreadElement") {
        const spread = this.readProperty(filename, property.argument, name);
        if (spread.kind !== "absent") result = spread;
        continue;
      }
      const key =
        !property.computed && property.key.type === "Identifier"
          ? property.key.name
          : property.key.type === "Literal" && typeof property.key.value === "string"
            ? property.key.value
            : null;
      if (key === null) result = { kind: "unknown" };
      else if (key === name)
        result =
          property.kind === "init" && !property.method
            ? { kind: "value", expression: property.value }
            : { kind: "unknown" };
    }
    return result;
  }

  private guard<T>(key: string, operation: GuardedOperation<T>): T | null {
    if (this.active.has(key)) return null;
    this.active.add(key);
    try {
      return operation();
    } finally {
      this.active.delete(key);
    }
  }
}
