import type { TSESTree } from "@typescript-eslint/types";
import type { ExportDefaultDeclaration, Program, VariableDeclaration, VariableDeclarator } from "oxc-parser";

type LintMetaBinding = {
  declaration: TSESTree.VariableDeclaration;
  declarator: TSESTree.VariableDeclarator;
};
type ParsedMetaBinding = {
  declaration: VariableDeclaration;
  declarator: VariableDeclarator;
};
type MetaProgram = TSESTree.Program | Program;
type MetaDefaultExport = TSESTree.ExportDefaultDeclaration | ExportDefaultDeclaration;
type MetaVariableDeclaration = TSESTree.VariableDeclaration | VariableDeclaration;
type MetaVariableDeclarator = TSESTree.VariableDeclarator | VariableDeclarator;
type MetaBinding = {
  declaration: MetaVariableDeclaration;
  declarator: MetaVariableDeclarator;
};

export function readDefaultExportDeclaration(program: TSESTree.Program): TSESTree.ExportDefaultDeclaration | null;
export function readDefaultExportDeclaration(program: Program): ExportDefaultDeclaration | null;
export function readDefaultExportDeclaration(program: MetaProgram): MetaDefaultExport | null {
  return program.body.find((statement) => statement.type === "ExportDefaultDeclaration") ?? null;
}

export function readTopLevelVariableDeclarator(program: TSESTree.Program, name: string): LintMetaBinding | null;
export function readTopLevelVariableDeclarator(program: Program, name: string): ParsedMetaBinding | null;
export function readTopLevelVariableDeclarator(program: MetaProgram, name: string): MetaBinding | null {
  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declarator of statement.declarations) {
      if (declarator.id.type === "Identifier" && declarator.id.name === name) {
        return { declaration: statement, declarator };
      }
    }
  }
  return null;
}
