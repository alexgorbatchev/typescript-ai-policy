import type { Expression, ObjectExpression, ObjectProperty, Program } from "oxc-parser";
import type { ExportResolution, ModuleImportBinding, ModuleSymbol, ParsedModule, StaticProperty } from "./types.ts";
import { readFileSync } from "node:fs";
import { parseSync } from "oxc-parser";
import { ResolverFactory } from "oxc-resolver";
import { readBindingPath } from "./readBindingPath.ts";
import { readModuleBindings } from "./readModuleBindings.ts";
import { resolveModulePath } from "./resolveModulePath.ts";

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
    this.currentFilename = resolveModulePath(currentFilename);
    this.currentSource = currentSource;
  }

  readProgram(filename: string): Program | null {
    return this.readModule(filename)?.program ?? null;
  }

  resolveImport(filename: string, specifier: string): string | null {
    try {
      return this.resolver.resolveFileSync(resolveModulePath(filename), specifier).path ?? null;
    } catch {
      return null;
    }
  }

  resolveBinding(filename: string, names: readonly string[]): ModuleSymbol | null {
    filename = resolveModulePath(filename);
    return this.guard(`binding:${filename}:${JSON.stringify(names)}`, () => {
      const [name, ...members] = names;
      if (!name) return null;
      const module = this.readModule(filename);
      const binding = module?.bindings.get(name);
      if (!binding || binding.kind === "unknown") return null;
      if (binding.kind === "import") {
        if (members.length > 0 && this.hasUnsafeImportAlias(filename, binding, members)) return null;
        const resolution = this.resolveRemote(filename, binding.source, [...binding.names, ...members]);
        return resolution === "unresolved" ? null : resolution;
      }
      if (binding.kind === "runtime") return members.length === 0 ? { filename, name } : null;
      const initializer = binding.declarator.init;
      if (!initializer) return null;
      if (members.length > 0) {
        if (!module?.safety.isStable(binding.declarator.id)) return null;
        return this.resolveMember(filename, initializer, members);
      }
      const path = readBindingPath(initializer);
      return path ? this.resolveBinding(filename, path) : { filename, name };
    });
  }

  resolveExpression(filename: string, expression: Expression): ModuleSymbol | null {
    filename = resolveModulePath(filename);
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
    filename = resolveModulePath(filename);
    const result = this.guard(`property:${filename}:${expression.start}:${name}`, () => {
      const module = this.readModule(filename);
      if (!module?.safety.isStable(expression)) return { kind: "unknown" } satisfies StaticProperty;
      if (expression.type === "ObjectExpression") return this.readObjectProperty(filename, expression, name);
      if (module.safety.isObjectAssignment(expression)) {
        let value: StaticProperty = { kind: "absent" };
        for (const source of expression.arguments.slice(1)) {
          if (source.type === "SpreadElement" || !this.isAssignmentSource(filename, source))
            return { kind: "unknown" } satisfies StaticProperty;
          const property = this.readProperty(filename, source, name);
          if (property.kind !== "absent") value = property;
        }
        return value;
      }
      if (expression.type === "Identifier") {
        const binding = module.bindings.get(expression.name);
        if (binding?.kind === "const" && binding.declarator.init && module.safety.isStable(binding.declarator.id))
          return this.readProperty(filename, binding.declarator.init, name);
      }
      return { kind: "unknown" } satisfies StaticProperty;
    });
    return result ?? { kind: "unknown" };
  }

  private isAssignmentSource(filename: string, expression: Expression): boolean {
    return (
      this.guard(`assignment-source:${filename}:${expression.start}`, () => {
        const module = this.readModule(filename);
        if (!module?.safety.isStable(expression)) return false;
        if (expression.type === "Identifier") {
          const binding = module.bindings.get(expression.name);
          return (
            binding?.kind === "const" &&
            !!binding.declarator.init &&
            module.safety.isStable(binding.declarator.id) &&
            this.isAssignmentSource(filename, binding.declarator.init)
          );
        }
        return (
          expression.type === "ObjectExpression" &&
          expression.properties.every((property) => {
            if (property.type === "SpreadElement") return this.isAssignmentSource(filename, property.argument);
            const key = this.readPropertyName(property);
            // Native assignment invokes setters. Unknown/prototype keys and getters
            // cannot establish a side-effect-free construction even if later overwritten.
            return property.kind === "init" && key !== null && key !== "__proto__";
          })
        );
      }) ?? false
    );
  }

  private readModule(filename: string): ParsedModule | null {
    filename = resolveModulePath(filename);
    if (this.modules.has(filename)) return this.modules.get(filename) ?? null;
    let module: ParsedModule | null = null;
    try {
      const source = filename === this.currentFilename ? this.currentSource : readFileSync(filename, "utf8");
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

  private hasUnsafeImportAlias(filename: string, binding: ModuleImportBinding, members: readonly string[]): boolean {
    const module = this.readModule(filename);
    if (!module) return true;
    const unsafeImports = [...module.bindings.values()].filter(
      (candidate) => candidate.kind === "import" && !module.safety.isStable(candidate.specifier),
    );
    if (unsafeImports.length === 0) return false;
    return (
      this.guard(`import-safety:${filename}:${binding.specifier.start}:${JSON.stringify(members)}`, () => {
        const names = binding.names.length > 0 ? binding.names : members.slice(0, 1);
        const owner = this.resolveRemote(filename, binding.source, names);
        if (!owner || owner === "unresolved") return true;
        for (const candidate of unsafeImports) {
          if (candidate.kind !== "import") continue;
          if (candidate.names.length === 0) {
            const target = this.resolveImport(filename, candidate.source);
            if (target && this.exportsObject(target, owner)) return true;
          } else {
            const other = this.resolveRemote(filename, candidate.source, candidate.names);
            if (other && other !== "unresolved" && other.filename === owner.filename && other.name === owner.name)
              return true;
          }
        }
        return false;
      }) ?? true
    );
  }

  private exportsObject(filename: string, expected: ModuleSymbol): boolean {
    return (
      this.guard(`exported-object:${filename}:${expected.filename}:${expected.name}`, () => {
        const module = this.readModule(filename);
        if (!module) return true;
        for (const [name, exported] of module.exports) {
          if (exported.kind === "remote" && exported.names.length === 0) {
            const target = this.resolveImport(filename, exported.source);
            if (target && this.exportsObject(target, expected)) return true;
          }
          const symbol = this.resolveExport(filename, [name]);
          if (
            symbol &&
            symbol !== "unresolved" &&
            symbol.filename === expected.filename &&
            symbol.name === expected.name
          )
            return true;
        }
        for (const source of module.starExports) {
          const target = this.resolveImport(filename, source);
          if (target && this.exportsObject(target, expected)) return true;
        }
        return false;
      }) ?? false
    );
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
      const key = this.readPropertyName(property);
      if (key === null) result = { kind: "unknown" };
      else if (key === name)
        result =
          property.kind === "init" && !property.method
            ? { kind: "value", expression: property.value }
            : { kind: "unknown" };
    }
    return result;
  }

  private readPropertyName(property: ObjectProperty): string | null {
    if (!property.computed && property.key.type === "Identifier") return property.key.name;
    return property.key.type === "Literal" && typeof property.key.value === "string" ? property.key.value : null;
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
