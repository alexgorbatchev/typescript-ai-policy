import { basename, dirname, join } from "node:path";
import type {
  OxlintDiagnostic,
  SemanticFixOperation,
  SemanticFixProvider,
  SemanticFixProviderContext,
} from "../types.ts";
import { readAbsoluteDiagnosticFilePath } from "./helpers.ts";

const REQUIRED_TEST_FILE_NAME_PATTERN = /\.test\.tsx?$/u;
const TESTS_DIRECTORY_PATH_PATTERN = /(^|\/)__tests__(\/|$)/u;

function isInTestsDirectory(filePath: string): boolean {
  return TESTS_DIRECTORY_PATH_PATTERN.test(filePath.replaceAll("\\", "/"));
}

function readOperation(diagnostic: OxlintDiagnostic, context: SemanticFixProviderContext): SemanticFixOperation | null {
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

export function createTestFileLocationConventionSemanticFixProvider(): SemanticFixProvider {
  return {
    createOperation(diagnostic, context): SemanticFixOperation | null {
      return readOperation(diagnostic, context);
    },
    ruleCode: "@alexgorbatchev/test-file-location-convention",
  };
}
