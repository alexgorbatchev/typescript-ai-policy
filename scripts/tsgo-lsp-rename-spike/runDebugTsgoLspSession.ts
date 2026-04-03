import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

type IJsonRpcIdentifier = number | string | null;

type IJsonRpcMessage = {
  id?: IJsonRpcIdentifier;
  jsonrpc: string;
  method?: string;
  params?: unknown;
  result?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isJsonRpcServerRequest(message: unknown): message is IJsonRpcMessage {
  if (!isRecord(message)) {
    return false;
  }

  const hasIdentifier = typeof message.id === "number" || typeof message.id === "string" || message.id === null;
  return message.jsonrpc === "2.0" && typeof message.method === "string" && hasIdentifier;
}

function readServerRequestResult(method: string): unknown {
  switch (method) {
    case "client/registerCapability":
      return null;
    case "workspace/configuration":
      return [];
    default:
      return null;
  }
}

function writeJsonRpcMessage(processHandle: ReturnType<typeof spawn>, message: IJsonRpcMessage): void {
  const stdinStream = processHandle.stdin;
  if (!stdinStream) {
    throw new Error("tsgo debug process stdin is unavailable");
  }

  const serializedMessage = JSON.stringify(message);
  const contentLength = Buffer.byteLength(serializedMessage, "utf8");
  stdinStream.write(`Content-Length: ${String(contentLength)}\r\n\r\n${serializedMessage}`);
}

const projectPath = await mkdtemp(join(tmpdir(), "tsgo-lsp-debug-"));
const tsgoExecutablePath = join(process.cwd(), "node_modules/.bin/tsgo");

await mkdir(projectPath, { recursive: true });
await writeFile(
  join(projectPath, "tsconfig.json"),
  `{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
`,
  "utf8",
);
await writeFile(
  join(projectPath, "models.ts"),
  `export interface UserProfile {
  id: string;
}

export function readProfileId(profile: UserProfile): string {
  return profile.id;
}
`,
  "utf8",
);
await writeFile(
  join(projectPath, "consumer.ts"),
  `import type { UserProfile } from "./models";

export function formatProfile(profile: UserProfile): string {
  return profile.id;
}
`,
  "utf8",
);

const processHandle = spawn(tsgoExecutablePath, ["--lsp", "--stdio"], {
  cwd: projectPath,
  stdio: ["pipe", "pipe", "pipe"],
});
const stdoutStream = processHandle.stdout;
const stderrStream = processHandle.stderr;

if (!stdoutStream || !stderrStream || !processHandle.stdin) {
  throw new Error("tsgo debug process stdio is unavailable");
}

let stdoutBuffer = Buffer.alloc(0);

stdoutStream.on("data", (chunk: Buffer) => {
  stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);

  while (true) {
    const headerEnd = stdoutBuffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const headerText = stdoutBuffer.subarray(0, headerEnd).toString("utf8");
    const contentLengthMatch = /Content-Length: (\d+)/i.exec(headerText);
    if (!contentLengthMatch) {
      throw new Error(`Missing Content-Length header: ${headerText}`);
    }

    const contentLength = Number(contentLengthMatch[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;
    if (stdoutBuffer.length < messageEnd) {
      return;
    }

    const messageText = stdoutBuffer.subarray(messageStart, messageEnd).toString("utf8");
    stdoutBuffer = stdoutBuffer.subarray(messageEnd);

    console.log(messageText);

    const parsedMessage: unknown = JSON.parse(messageText);
    if (isJsonRpcServerRequest(parsedMessage) && parsedMessage.method) {
      writeJsonRpcMessage(processHandle, {
        id: parsedMessage.id,
        jsonrpc: "2.0",
        result: readServerRequestResult(parsedMessage.method),
      });
    }
  }
});

stderrStream.on("data", (chunk: Buffer) => {
  console.error(chunk.toString("utf8"));
});

writeJsonRpcMessage(processHandle, {
  id: 0,
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    capabilities: {
      textDocument: {
        rename: {
          prepareSupport: true,
        },
      },
      workspace: {
        workspaceEdit: {
          documentChanges: false,
        },
      },
    },
    processId: process.pid,
    rootUri: pathToFileURL(projectPath).toString(),
    workspaceFolders: [
      {
        name: "workspace",
        uri: pathToFileURL(projectPath).toString(),
      },
    ],
  },
});
setTimeout(() => {
  writeJsonRpcMessage(processHandle, {
    jsonrpc: "2.0",
    method: "initialized",
  });
}, 100);
setTimeout(() => {
  writeJsonRpcMessage(processHandle, {
    id: 1,
    jsonrpc: "2.0",
    method: "textDocument/prepareRename",
    params: {
      position: {
        character: 17,
        line: 0,
      },
      textDocument: {
        uri: pathToFileURL(join(projectPath, "models.ts")).toString(),
      },
    },
  });
}, 200);
setTimeout(() => {
  writeJsonRpcMessage(processHandle, {
    id: 2,
    jsonrpc: "2.0",
    method: "textDocument/rename",
    params: {
      newName: "IUserProfile",
      position: {
        character: 17,
        line: 0,
      },
      textDocument: {
        uri: pathToFileURL(join(projectPath, "models.ts")).toString(),
      },
    },
  });
}, 300);
setTimeout(() => {
  writeJsonRpcMessage(processHandle, {
    id: 3,
    jsonrpc: "2.0",
    method: "shutdown",
  });
}, 600);
setTimeout(() => {
  writeJsonRpcMessage(processHandle, {
    jsonrpc: "2.0",
    method: "exit",
  });
}, 700);
setTimeout(() => {
  if (processHandle.exitCode === null && processHandle.signalCode === null) {
    processHandle.kill("SIGKILL");
  }
}, 1200);

await once(processHandle, "close");
await rm(projectPath, { force: true, recursive: true });
