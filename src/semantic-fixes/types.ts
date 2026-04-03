export type IOxlintSpan = {
  column: number;
  length: number;
  line: number;
  offset: number;
};

export type IOxlintLabel = {
  label?: string;
  span: IOxlintSpan;
};

export type IOxlintDiagnostic = {
  code: string;
  filename: string;
  labels: readonly IOxlintLabel[];
  message: string;
  severity: string;
};

export type IOxlintJsonReport = {
  diagnostics: readonly IOxlintDiagnostic[];
};

export type ILineAndCharacter = {
  character: number;
  line: number;
};

export type ITextEdit = {
  end: ILineAndCharacter;
  filePath: string;
  newText: string;
  start: ILineAndCharacter;
};

export type ISymbolRenameOperation = {
  filePath: string;
  id: string;
  kind: "rename-symbol";
  newName: string;
  position: ILineAndCharacter;
  ruleCode: string;
  symbolName: string;
};

export type IMoveFileOperation = {
  filePath: string;
  id: string;
  kind: "move-file";
  newFilePath: string;
  ruleCode: string;
};

export type ISemanticFixOperation = ISymbolRenameOperation | IMoveFileOperation;

export type IFileMove = {
  destinationFilePath: string;
  sourceFilePath: string;
};

export type ISemanticFixPlan = {
  description: string;
  fileMoves: readonly IFileMove[];
  operationId: string;
  ruleCode: string;
  textEdits: readonly ITextEdit[];
};

export type ISemanticFixPlanSuccess = {
  kind: "plan";
  plan: ISemanticFixPlan;
};

export type ISemanticFixPlanSkip = {
  kind: "skip";
  reason: string;
};

export type ISemanticFixPlanResult = ISemanticFixPlanSkip | ISemanticFixPlanSuccess;

export type ISemanticFixProviderContext = {
  targetDirectoryPath: string;
};

export type ISemanticFixProvider = {
  createOperation: (
    diagnostic: IOxlintDiagnostic,
    context: ISemanticFixProviderContext,
  ) => ISemanticFixOperation | null;
  ruleCode: string;
};

export type ISemanticFixBackendContext = {
  targetDirectoryPath: string;
};

export type ISemanticFixBackend = {
  createPlan: (
    operation: ISemanticFixOperation,
    context: ISemanticFixBackendContext,
  ) => Promise<ISemanticFixPlanResult>;
  dispose: () => Promise<void>;
  name: string;
};

export type IApplySemanticFixesProgressEvent =
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

export type IApplySemanticFixesOptions = {
  dryRun?: boolean;
  onProgress?: (event: IApplySemanticFixesProgressEvent) => void;
  oxlintConfigPath: string;
  oxlintExecutablePath: string;
  targetDirectoryPath: string;
  tsgoExecutablePath: string;
};

export type ISkippedDiagnostic = {
  filePath: string;
  reason: string;
  ruleCode: string;
};

export type IApplySemanticFixesResult = {
  appliedFileCount: number;
  backendName: string;
  changedFilePaths: readonly string[];
  plannedFixCount: number;
  skippedDiagnostics: readonly ISkippedDiagnostic[];
};
