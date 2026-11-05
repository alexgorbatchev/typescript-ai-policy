import type { Declaration, ModuleExportName, Program } from "oxc-parser";
import type { ModuleBinding, ModuleExport, ParsedModule } from "./types.ts";
import { StaticBindingSafety } from "./StaticBindingSafety.ts";

function readExportName(name: ModuleExportName): string {
  return name.type === "Identifier" ? name.name : name.value;
}

function addDeclaration(bindings: Map<string, ModuleBinding>, declaration: Declaration): string[] {
  if (declaration.type === "VariableDeclaration") {
    const names: string[] = [];
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== "Identifier") continue;
      names.push(declarator.id.name);
      bindings.set(
        declarator.id.name,
        declaration.kind === "const" ? { kind: "const", declarator } : { kind: "unknown" },
      );
    }
    return names;
  }
  if ((declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") && declaration.id) {
    bindings.set(declaration.id.name, { kind: "runtime" });
    return [declaration.id.name];
  }
  return [];
}

export function readModuleBindings(program: Program): ParsedModule {
  const bindings = new Map<string, ModuleBinding>();
  const exports = new Map<string, ModuleExport>();
  const starExports: string[] = [];
  for (const statement of program.body) {
    if (statement.type === "ImportDeclaration") {
      if (statement.importKind === "type") continue;
      for (const specifier of statement.specifiers) {
        if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") continue;
        const names =
          specifier.type === "ImportNamespaceSpecifier"
            ? []
            : [specifier.type === "ImportDefaultSpecifier" ? "default" : readExportName(specifier.imported)];
        bindings.set(specifier.local.name, { kind: "import", source: statement.source.value, names, specifier });
      }
    } else if (statement.type === "ExportNamedDeclaration") {
      if (statement.exportKind === "type") continue;
      if (statement.declaration) {
        for (const name of addDeclaration(bindings, statement.declaration)) exports.set(name, { kind: "local", name });
      }
      for (const specifier of statement.specifiers) {
        if (specifier.exportKind === "type") continue;
        const name = readExportName(specifier.local);
        exports.set(
          readExportName(specifier.exported),
          statement.source
            ? { kind: "remote", source: statement.source.value, names: [name] }
            : { kind: "local", name },
        );
      }
    } else if (statement.type === "ExportAllDeclaration") {
      if (statement.exportKind === "type") continue;
      if (statement.exported)
        exports.set(readExportName(statement.exported), { kind: "remote", source: statement.source.value, names: [] });
      else starExports.push(statement.source.value);
    } else if (statement.type === "ExportDefaultDeclaration") {
      const declaration = statement.declaration;
      if (declaration.type === "TSInterfaceDeclaration") continue;
      if ((declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") && declaration.id) {
        addDeclaration(bindings, declaration);
        exports.set("default", { kind: "local", name: declaration.id.name });
      } else exports.set("default", { kind: "expression", expression: declaration });
    } else if (
      statement.type === "VariableDeclaration" ||
      statement.type === "FunctionDeclaration" ||
      statement.type === "ClassDeclaration"
    ) {
      addDeclaration(bindings, statement);
    }
  }
  return { program, bindings, exports, starExports, safety: new StaticBindingSafety(program) };
}
