import type { Expression, ImportDeclarationSpecifier, Program, VariableDeclarator } from "oxc-parser";
import type { StaticBindingSafety } from "./StaticBindingSafety.ts";

export type ModuleSymbol = { filename: string; name: string };
export type ExportResolution = ModuleSymbol | "unresolved" | null;
export type ModuleImportBinding = {
  kind: "import";
  source: string;
  names: string[];
  specifier: ImportDeclarationSpecifier;
};
export type ModuleBinding =
  | ModuleImportBinding
  | { kind: "const"; declarator: VariableDeclarator }
  | { kind: "runtime" }
  | { kind: "unknown" };
export type ModuleExport =
  | { kind: "local"; name: string }
  | { kind: "remote"; source: string; names: string[] }
  | { kind: "expression"; expression: Expression };
export type ParsedModule = {
  program: Program;
  bindings: Map<string, ModuleBinding>;
  exports: Map<string, ModuleExport>;
  starExports: string[];
  safety: StaticBindingSafety;
};
export type StaticProperty = { kind: "value"; expression: Expression } | { kind: "absent" } | { kind: "unknown" };
