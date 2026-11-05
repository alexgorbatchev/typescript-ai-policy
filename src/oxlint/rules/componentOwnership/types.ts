import type { Expression, Program, VariableDeclarator } from "oxc-parser";

export type ModuleSymbol = { filename: string; name: string };
export type ExportResolution = ModuleSymbol | "unresolved" | null;
export type ModuleBinding =
  | { kind: "import"; source: string; names: string[] }
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
};
export type StaticProperty = { kind: "value"; expression: Expression } | { kind: "absent" } | { kind: "unknown" };
