import ts from "typescript";
import type { ILineAndCharacter } from "./types.ts";

export function readLineAndCharacterFromOffset(content: string, offset: number): ILineAndCharacter {
  const sourceFile = ts.createSourceFile("file.ts", content, ts.ScriptTarget.Latest, true);
  const lineAndCharacter = ts.getLineAndCharacterOfPosition(sourceFile, offset);

  return {
    character: lineAndCharacter.character,
    line: lineAndCharacter.line,
  };
}
