import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { normalizeProjectRelativePath } from "./normalizeProjectRelativePath.ts";
import { readLineAndCharacterFromOffset } from "./readLineAndCharacterFromOffset.ts";
import type { IRenameBackendResult, IRenameEdit } from "./types.ts";

type IFileContentCache = Map<string, string>;

function readDiagnosticMessage(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function readParsedCommandLine(projectPath: string): ts.ParsedCommandLine {
  const tsconfigPath = join(projectPath, "tsconfig.json");
  const parseConfigHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic: ts.Diagnostic): void {
      throw new Error(readDiagnosticMessage(diagnostic));
    },
  };

  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, parseConfigHost);
  if (!parsedCommandLine) {
    throw new Error(`Failed to read tsconfig.json from ${projectPath}`);
  }

  return parsedCommandLine;
}

function readFileContent(filePath: string, fileContentCache: IFileContentCache): string {
  const cachedContent = fileContentCache.get(filePath);
  if (cachedContent !== undefined) {
    return cachedContent;
  }

  const content = readFileSync(filePath, "utf8");
  fileContentCache.set(filePath, content);
  return content;
}

function createLanguageService(
  projectPath: string,
  parsedCommandLine: ts.ParsedCommandLine,
  fileContentCache: IFileContentCache,
): ts.LanguageService {
  const languageServiceHost: ts.LanguageServiceHost = {
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getCompilationSettings(): ts.CompilerOptions {
      return parsedCommandLine.options;
    },
    getCurrentDirectory(): string {
      return projectPath;
    },
    getDefaultLibFileName(options: ts.CompilerOptions): string {
      return ts.getDefaultLibFilePath(options);
    },
    getScriptFileNames(): string[] {
      return parsedCommandLine.fileNames;
    },
    getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
      const content = ts.sys.readFile(fileName);
      if (content === undefined) {
        return undefined;
      }

      fileContentCache.set(fileName, content);
      return ts.ScriptSnapshot.fromString(content);
    },
    getScriptVersion(): string {
      return "0";
    },
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    useCaseSensitiveFileNames(): boolean {
      return ts.sys.useCaseSensitiveFileNames;
    },
  };

  return ts.createLanguageService(languageServiceHost);
}

function readRenameEdit(
  projectPath: string,
  location: ts.RenameLocation,
  newName: string,
  fileContentCache: IFileContentCache,
): IRenameEdit {
  const content = readFileContent(location.fileName, fileContentCache);
  const start = readLineAndCharacterFromOffset(content, location.textSpan.start);
  const end = readLineAndCharacterFromOffset(content, location.textSpan.start + location.textSpan.length);
  const prefixText = location.prefixText ?? "";
  const suffixText = location.suffixText ?? "";

  return {
    end,
    filePath: normalizeProjectRelativePath(projectPath, location.fileName),
    newText: `${prefixText}${newName}${suffixText}`,
    start,
  };
}

function compareRenameEdit(left: IRenameEdit, right: IRenameEdit): number {
  if (left.filePath !== right.filePath) {
    return left.filePath.localeCompare(right.filePath);
  }

  if (left.start.line !== right.start.line) {
    return left.start.line - right.start.line;
  }

  if (left.start.character !== right.start.character) {
    return left.start.character - right.start.character;
  }

  return left.newText.localeCompare(right.newText);
}

export function readTypeScriptRenameResult(
  projectPath: string,
  targetFilePath: string,
  targetOffset: number,
  newName: string,
): IRenameBackendResult {
  const fileContentCache: IFileContentCache = new Map();
  const parsedCommandLine = readParsedCommandLine(projectPath);
  const languageService = createLanguageService(projectPath, parsedCommandLine, fileContentCache);

  try {
    const renameInfo = languageService.getRenameInfo(targetFilePath, targetOffset, {
      allowRenameOfImportPath: false,
    });

    if (!renameInfo.canRename) {
      return {
        backendName: "typescript-language-service",
        canRename: false,
        edits: [],
        failureReason: renameInfo.localizedErrorMessage,
      };
    }

    const renameLocations =
      languageService.findRenameLocations(targetFilePath, targetOffset, false, false, {
        allowRenameOfImportPath: false,
        providePrefixAndSuffixTextForRename: true,
      }) ?? [];

    const edits = renameLocations
      .map((location) => readRenameEdit(projectPath, location, newName, fileContentCache))
      .sort(compareRenameEdit);

    return {
      backendName: "typescript-language-service",
      canRename: true,
      edits,
      failureReason: null,
    };
  } finally {
    languageService.dispose();
  }
}
