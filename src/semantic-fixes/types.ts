export type OxlintSpan = {
  column: number;
  length: number;
  line: number;
  offset: number;
};

export type OxlintLabel = {
  label?: string;
  span: OxlintSpan;
};

export type OxlintDiagnostic = {
  code: string;
  filename: string;
  labels: readonly OxlintLabel[];
  message: string;
  severity: string;
};

export type OxlintJsonReport = {
  diagnostics: readonly OxlintDiagnostic[];
};

export type LineAndCharacter = {
  character: number;
  line: number;
};

export type TextEdit = {
  end: LineAndCharacter;
  filePath: string;
  newText: string;
  start: LineAndCharacter;
};

export type SymbolRenameOperation = {
  filePath: string;
  id: string;
  kind: "rename-symbol";
  newName: string;
  position: LineAndCharacter;
  ruleCode: string;
  symbolName: string;
};

export type MoveFileOperation = {
  filePath: string;
  id: string;
  kind: "move-file";
  newFilePath: string;
  ruleCode: string;
};

export type SemanticFixOperation = SymbolRenameOperation | MoveFileOperation;

export type FileMove = {
  destinationFilePath: string;
  sourceFilePath: string;
};

export type SemanticFixPlan = {
  description: string;
  fileMoves: readonly FileMove[];
  operationId: string;
  ruleCode: string;
  textEdits: readonly TextEdit[];
};

export type SemanticFixPlanSuccess = {
  kind: "plan";
  plan: SemanticFixPlan;
};

export type SemanticFixPlanSkip = {
  kind: "skip";
  reason: string;
};

export type SemanticFixPlanResult = SemanticFixPlanSkip | SemanticFixPlanSuccess;

export type SemanticFixProviderContext = {
  targetDirectoryPath: string;
};

export type SemanticFixProvider = {
  createOperation: (diagnostic: OxlintDiagnostic, context: SemanticFixProviderContext) => SemanticFixOperation | null;
  ruleCode: string;
};

export type SemanticFixBackendContext = {
  targetDirectoryPath: string;
};

export type SemanticFixBackend = {
  createPlan: (operation: SemanticFixOperation, context: SemanticFixBackendContext) => Promise<SemanticFixPlanResult>;
  dispose: () => Promise<void>;
  name: string;
};

export type ApplySemanticFixesProgressEvent =
  | {
      kind: "running-oxlint";
      targetDirectoryPath: string;
    }
  | {
      diagnosticCount: number;
      kind: "collected-diagnostics";
    }
  | {
      kind: "planning-start";
      operationCount: number;
    }
  | {
      description: string;
      kind: "planning-operation";
      operationCount: number;
      operationId: string;
      operationIndex: number;
    }
  | {
      dryRun: boolean;
      fileCount: number;
      kind: "applying-file-changes";
      moveCount: number;
      textEditCount: number;
    }
  | {
      appliedFileCount: number;
      changedFileCount: number;
      kind: "complete";
      plannedFixCount: number;
      skippedDiagnosticCount: number;
    };

export type ApplySemanticFixesOptions = {
  dryRun?: boolean;
  onProgress?: (event: ApplySemanticFixesProgressEvent) => void;
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  targetDirectoryPath: string;
  tsgoExecutablePath: string;
};

export type SkippedDiagnostic = {
  filePath: string;
  reason: string;
  ruleCode: string;
};

export type ApplySemanticFixesResult = {
  appliedFileCount: number;
  backendName: string;
  changedFilePaths: readonly string[];
  plannedFixCount: number;
  skippedDiagnostics: readonly SkippedDiagnostic[];
};
