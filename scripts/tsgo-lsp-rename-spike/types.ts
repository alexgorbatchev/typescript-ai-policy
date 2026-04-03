export type ISourceFileFixture = {
  content: string;
  filePath: string;
};

export type IRenameTarget = {
  filePath: string;
  marker: string;
  newName: string;
};

export type IRenameComparisonCase = {
  description: string;
  files: readonly ISourceFileFixture[];
  name: string;
  target: IRenameTarget;
  tsconfigContent: string;
};

export type ILineAndCharacter = {
  character: number;
  line: number;
};

export type IRenameEdit = {
  end: ILineAndCharacter;
  filePath: string;
  newText: string;
  start: ILineAndCharacter;
};

export type IRenameBackendResult = {
  backendName: string;
  canRename: boolean;
  edits: readonly IRenameEdit[];
  failureReason: string | null;
};

export type IRenameCaseComparison = {
  caseName: string;
  description: string;
  tsgoResult: IRenameBackendResult;
  typescriptResult: IRenameBackendResult;
};

export type IPreparedProject = {
  projectPath: string;
  targetFilePath: string;
  targetOffset: number;
};
