import { spawn } from "node:child_process";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import type { ILineAndCharacter } from "../../types.ts";

type IJsonRpcIdentifier = number | string | null;

type IJsonRpcError = {
  code: number;
  message: string;
};

type IJsonRpcErrorResponse = {
  error: IJsonRpcError;
  id: IJsonRpcIdentifier;
  jsonrpc: string;
};

type IJsonRpcRequestMessage = {
  id?: IJsonRpcIdentifier;
  jsonrpc: string;
  method: string;
  params?: unknown;
};

type IJsonRpcSuccessResponse = {
  id: IJsonRpcIdentifier;
  jsonrpc: string;
  result?: unknown;
};

type IJsonRpcResponse = IJsonRpcErrorResponse | IJsonRpcSuccessResponse;

type ILspTextDocumentIdentifier = {
  uri: string;
};

type ILspPosition = {
  character: number;
  line: number;
};

type ILspWorkspaceFolder = {
  name: string;
  uri: string;
};

type ILspWorkspaceEditCapabilities = {
  documentChanges: boolean;
};

type ILspWorkspaceCapabilities = {
  workspaceEdit: ILspWorkspaceEditCapabilities;
};

type ILspRenameCapabilities = {
  prepareSupport: boolean;
};

type ILspTextDocumentCapabilities = {
  rename: ILspRenameCapabilities;
};

type ILspClientCapabilities = {
  textDocument: ILspTextDocumentCapabilities;
  workspace: ILspWorkspaceCapabilities;
};

type ILspInitializeParams = {
  capabilities: ILspClientCapabilities;
  processId: number;
  rootUri: string;
  workspaceFolders: readonly ILspWorkspaceFolder[];
};

type ILspPrepareRenameParams = {
  position: ILspPosition;
  textDocument: ILspTextDocumentIdentifier;
};

type ILspRenameParams = {
  newName: string;
  position: ILspPosition;
  textDocument: ILspTextDocumentIdentifier;
};

type ITsgoLspClientOptions = {
  tsgoExecutablePath: string;
  workspacePath: string;
};

type IPendingRequest = {
  reject: (error: Error) => void;
  resolve: (result: unknown) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isJsonRpcError(value: unknown): value is IJsonRpcError {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === "number" && typeof value.message === "string";
}

function isJsonRpcRequestMessage(value: unknown): value is IJsonRpcRequestMessage {
  if (!isRecord(value)) {
    return false;
  }

  return value.jsonrpc === "2.0" && typeof value.method === "string";
}

function isJsonRpcResponse(value: unknown): value is IJsonRpcResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (value.jsonrpc !== "2.0") {
    return false;
  }

  const hasIdentifier = typeof value.id === "number" || typeof value.id === "string" || value.id === null;
  if (!hasIdentifier) {
    return false;
  }

  if (Reflect.has(value, "error")) {
    return isJsonRpcError(value.error);
  }

  return Reflect.has(value, "result");
}

function readLspPosition(position: ILineAndCharacter): ILspPosition {
  return {
    character: position.character,
    line: position.line,
  };
}

export class TsgoLspClient {
  private readonly pendingRequests = new Map<number, IPendingRequest>();
  private readonly process: ReturnType<typeof spawn>;
  private readonly stderrChunks: string[] = [];
  private stdoutBuffer = Buffer.alloc(0);
  private requestId = 0;

  public constructor(private readonly options: ITsgoLspClientOptions) {
    this.process = spawn(this.options.tsgoExecutablePath, ["--lsp", "--stdio"], {
      cwd: this.options.workspacePath,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutStream = this.process.stdout;
    if (!stdoutStream) {
      throw new Error("tsgo LSP stdout is unavailable");
    }

    const stderrStream = this.process.stderr;
    if (!stderrStream) {
      throw new Error("tsgo LSP stderr is unavailable");
    }

    stdoutStream.on("data", (chunk: Buffer) => {
      this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, chunk]);
      this.consumeOutputBuffer();
    });

    stderrStream.on("data", (chunk: Buffer) => {
      this.stderrChunks.push(chunk.toString("utf8"));
    });

    this.process.on("error", (error: Error) => {
      this.rejectPendingRequests(error);
    });

    this.process.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      const stderrOutput = this.readStderrOutput();
      const failureReason = `tsgo LSP exited before the request completed (code=${String(code)}, signal=${String(signal)})${stderrOutput}`;
      this.rejectPendingRequests(new Error(failureReason));
    });
  }

  public async initialize(): Promise<void> {
    const rootUri = pathToFileURL(this.options.workspacePath).toString();
    const initializeParams: ILspInitializeParams = {
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
      rootUri,
      workspaceFolders: [
        {
          name: "workspace",
          uri: rootUri,
        },
      ],
    };

    await this.sendRequest("initialize", initializeParams);
    this.sendNotification("initialized");
  }

  public prepareRename(filePath: string, position: ILineAndCharacter): Promise<unknown> {
    const params: ILspPrepareRenameParams = {
      position: readLspPosition(position),
      textDocument: {
        uri: pathToFileURL(filePath).toString(),
      },
    };

    return this.sendRequest("textDocument/prepareRename", params);
  }

  public rename(filePath: string, position: ILineAndCharacter, newName: string): Promise<unknown> {
    const params: ILspRenameParams = {
      newName,
      position: readLspPosition(position),
      textDocument: {
        uri: pathToFileURL(filePath).toString(),
      },
    };

    return this.sendRequest("textDocument/rename", params);
  }

  public async dispose(): Promise<void> {
    try {
      await this.sendRequest("shutdown");
    } catch {
      // The caller wants disposal to be best-effort.
    }

    this.sendNotification("exit");

    const stdinStream = this.process.stdin;
    if (stdinStream && !stdinStream.destroyed) {
      stdinStream.end();
    }

    await this.waitForClose(1000);
  }

  private consumeOutputBuffer(): void {
    while (true) {
      const headerEnd = this.stdoutBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.stdoutBuffer.subarray(0, headerEnd).toString("utf8");
      const contentLength = this.readContentLength(headerText);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.stdoutBuffer.length < messageEnd) {
        return;
      }

      const messageText = this.stdoutBuffer.subarray(messageStart, messageEnd).toString("utf8");
      this.stdoutBuffer = this.stdoutBuffer.subarray(messageEnd);

      const parsedMessage: unknown = JSON.parse(messageText);
      this.handleMessage(parsedMessage);
    }
  }

  private handleMessage(message: unknown): void {
    if (isJsonRpcResponse(message)) {
      this.handleResponse(message);
      return;
    }

    if (isJsonRpcRequestMessage(message)) {
      this.handleServerRequest(message);
    }
  }

  private handleResponse(message: IJsonRpcResponse): void {
    if (typeof message.id !== "number") {
      return;
    }

    const pendingRequest = this.pendingRequests.get(message.id);
    if (!pendingRequest) {
      return;
    }

    this.pendingRequests.delete(message.id);

    if ("error" in message) {
      pendingRequest.reject(new Error(`${message.error.message} (code=${String(message.error.code)})`));
      return;
    }

    pendingRequest.resolve(message.result ?? null);
  }

  private handleServerRequest(message: IJsonRpcRequestMessage): void {
    if (message.id === undefined) {
      return;
    }

    this.writeResponse(message.id, this.readServerRequestResult(message.method));
  }

  private readContentLength(headerText: string): number {
    const headerLines = headerText.split("\r\n");

    for (const headerLine of headerLines) {
      const lowerCasedHeaderLine = headerLine.toLowerCase();
      if (!lowerCasedHeaderLine.startsWith("content-length:")) {
        continue;
      }

      const rawValue = headerLine.slice("content-length:".length).trim();
      const contentLength = Number(rawValue);
      if (!Number.isInteger(contentLength) || contentLength < 0) {
        throw new Error(`Invalid Content-Length header: ${headerLine}`);
      }

      return contentLength;
    }

    throw new Error(`Missing Content-Length header: ${headerText}`);
  }

  private readServerRequestResult(method: string): unknown {
    switch (method) {
      case "client/registerCapability":
        return null;
      case "workspace/configuration":
        return [];
      default:
        return null;
    }
  }

  private readStderrOutput(): string {
    const stderrOutput = this.stderrChunks.join("").trim();
    if (stderrOutput.length === 0) {
      return "";
    }

    return `\n\nStderr:\n${stderrOutput}`;
  }

  private rejectPendingRequests(error: Error): void {
    for (const [requestId, pendingRequest] of this.pendingRequests) {
      this.pendingRequests.delete(requestId);
      pendingRequest.reject(error);
    }
  }

  private sendNotification(method: string, params?: unknown): void {
    this.writeMessage(method, undefined, params);
  }

  private sendRequest(method: string, params?: unknown): Promise<unknown> {
    const requestId = this.requestId;
    this.requestId += 1;

    const responsePromise = new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        reject,
        resolve,
      });
    });

    this.writeMessage(method, requestId, params);

    return responsePromise;
  }

  private async waitForClose(timeoutMs: number): Promise<void> {
    if (this.process.exitCode !== null || this.process.signalCode !== null) {
      return;
    }

    const closePromise = once(this.process, "close").then(() => undefined);
    const killTimer = setTimeout(() => {
      if (this.process.exitCode === null && this.process.signalCode === null) {
        this.process.kill("SIGKILL");
      }
    }, timeoutMs);

    await closePromise;
    clearTimeout(killTimer);
  }

  private writeMessage(method: string, id?: IJsonRpcIdentifier, params?: unknown): void {
    const message: Record<string, unknown> = {
      jsonrpc: "2.0",
      method,
    };

    if (id !== undefined) {
      message.id = id;
    }

    if (params !== undefined) {
      message.params = params;
    }

    this.writeSerializedMessage(message);
  }

  private writeResponse(id: IJsonRpcIdentifier, result: unknown): void {
    this.writeSerializedMessage({
      id,
      jsonrpc: "2.0",
      result,
    });
  }

  private writeSerializedMessage(message: Record<string, unknown>): void {
    const stdinStream = this.process.stdin;
    if (!stdinStream || stdinStream.destroyed) {
      throw new Error(`Cannot write to tsgo LSP stdin${this.readStderrOutput()}`);
    }

    const serializedMessage = JSON.stringify(message);
    const contentLength = Buffer.byteLength(serializedMessage, "utf8");
    stdinStream.write(`Content-Length: ${String(contentLength)}\r\n\r\n${serializedMessage}`);
  }
}
