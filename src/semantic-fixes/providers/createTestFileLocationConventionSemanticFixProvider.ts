import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type {
  IOxlintDiagnostic,
  ISemanticFixOperation,
  ISemanticFixProvider,
  ISemanticFixProviderContext,
} from "../types.ts";

const REQUIRED_TEST_FILE_NAME_PATTERN = /\.test\.tsx?$/u;
const TESTS_DIRECTORY_PATH_PATTERN = /(^|\/)__tests__(\/|$)/u;

function readAbsoluteDiagnosticFilePath(diagnostic: IOxlintDiagnostic, context: ISemanticFixProviderContext): string {
  if (isAbsolute(diagnostic.filename)) {
    return diagnostic.filename;
  }

  return resolve(context.targetDirectoryPath, diagnostic.filename);
}

function isInTestsDirectory(filePath: string): boolean {
  return TESTS_DIRECTORY_PATH_PATTERN.test(filePath.replaceAll("\\", "/"));
}

function readOperation(
  diagnostic: IOxlintDiagnostic,
  context: ISemanticFixProviderContext,
): ISemanticFixOperation | null {
  const filePath = readAbsoluteDiagnosticFilePath(diagnostic, context);
  const baseName = basename(filePath);
  if (!REQUIRED_TEST_FILE_NAME_PATTERN.test(baseName) || isInTestsDirectory(filePath)) {
    return null;
  }

  const newFilePath = join(dirname(filePath), "__tests__", baseName);

  return {
    filePath,
    id: `${diagnostic.code}:${filePath}:${newFilePath}`,
    kind: "move-file",
    newFilePath,
    ruleCode: diagnostic.code,
  };
}

export function createTestFileLocationConventionSemanticFixProvider(): ISemanticFixProvider {
  return {
    createOperation(diagnostic, context): ISemanticFixOperation | null {
      return readOperation(diagnostic, context);
    },
    ruleCode: "@alexgorbatchev/test-file-location-convention",
  };
}
