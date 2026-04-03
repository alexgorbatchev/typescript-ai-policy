import { expect, it } from "bun:test";
import { join } from "node:path";
import { compareRenameBackends } from "../compareRenameBackends.ts";

it("compares tsgo LSP rename edits against the TypeScript language service", async () => {
  const tsgoExecutablePath = join(process.cwd(), "node_modules/.bin/tsgo");
  const comparisons = await compareRenameBackends(tsgoExecutablePath);

  expect(comparisons).toMatchInlineSnapshot(`
    [
      {
        "caseName": "cross-file-exported-interface",
        "description": "Cross-file exported interface rename updates declarations, imports, and type references.",
        "tsgoResult": {
          "backendName": "tsgo-lsp",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 25,
                "line": 0,
              },
              "filePath": "consumer.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 14,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 2,
              },
              "filePath": "consumer.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 2,
              },
            },
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "models.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 4,
              },
              "filePath": "models.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 4,
              },
            },
          ],
          "failureReason": null,
        },
        "typescriptResult": {
          "backendName": "typescript-language-service",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 25,
                "line": 0,
              },
              "filePath": "consumer.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 14,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 2,
              },
              "filePath": "consumer.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 2,
              },
            },
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "models.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 4,
              },
              "filePath": "models.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 4,
              },
            },
          ],
          "failureReason": null,
        },
      },
      {
        "caseName": "declaration-merging",
        "description": "Declaration merging renames every merged declaration plus downstream type references.",
        "tsgoResult": {
          "backendName": "tsgo-lsp",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 28,
                "line": 4,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 4,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 8,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 8,
              },
            },
          ],
          "failureReason": null,
        },
        "typescriptResult": {
          "backendName": "typescript-language-service",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 28,
                "line": 4,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 4,
              },
            },
            {
              "end": {
                "character": 50,
                "line": 8,
              },
              "filePath": "contracts.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 39,
                "line": 8,
              },
            },
          ],
          "failureReason": null,
        },
      },
      {
        "caseName": "ambient-window",
        "description": "Ambient Window merging is blocked because the symbol belongs to the standard library contract.",
        "tsgoResult": {
          "backendName": "tsgo-lsp",
          "canRename": false,
          "edits": [],
          "failureReason": "You cannot rename elements that are defined in the standard TypeScript library. (code=-32803)",
        },
        "typescriptResult": {
          "backendName": "typescript-language-service",
          "canRename": false,
          "edits": [],
          "failureReason": "You cannot rename elements that are defined in the standard TypeScript library.",
        },
      },
      {
        "caseName": "public-dts-interface",
        "description": "Public declaration files can still be renamed semantically even though policy may choose to skip them.",
        "tsgoResult": {
          "backendName": "tsgo-lsp",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "public-api.d.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 52,
                "line": 4,
              },
              "filePath": "public-api.d.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 41,
                "line": 4,
              },
            },
          ],
          "failureReason": null,
        },
        "typescriptResult": {
          "backendName": "typescript-language-service",
          "canRename": true,
          "edits": [
            {
              "end": {
                "character": 28,
                "line": 0,
              },
              "filePath": "public-api.d.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 17,
                "line": 0,
              },
            },
            {
              "end": {
                "character": 52,
                "line": 4,
              },
              "filePath": "public-api.d.ts",
              "newText": "IUserProfile",
              "start": {
                "character": 41,
                "line": 4,
              },
            },
          ],
          "failureReason": null,
        },
      },
    ]
  `);
});
