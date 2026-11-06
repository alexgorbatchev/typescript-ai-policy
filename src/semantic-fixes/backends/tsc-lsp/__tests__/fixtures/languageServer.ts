import assert from "node:assert/strict";

const input: unknown = await Bun.file("messages.json").json();
assert(Array.isArray(input));
const messages: readonly unknown[] = input;
const responses: unknown[] = [];
let buffer = Buffer.alloc(0);

function isMessage(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function frame(message: string): Buffer {
  return Buffer.from(`Content-Length: ${String(Buffer.byteLength(message))}\r\n\r\n${message}`);
}

function respond(id: unknown, result: unknown): void {
  process.stdout.write(frame(JSON.stringify({ jsonrpc: "2.0", id, result })));
}

function handleMessage(message: Record<string, unknown>): void {
  if (!("method" in message)) {
    responses.push(message);
    return;
  }
  switch (message.method) {
    case "initialize": {
      const probes = messages.map((probe: unknown) => {
        assert(typeof probe === "string");
        return frame(probe);
      });
      probes.push(frame(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} })));
      const output = Buffer.concat(probes);
      process.stdout.write(output.subarray(0, 8));
      setImmediate(() => process.stdout.write(output.subarray(8)));
      return;
    }
    case "initialized":
      return;
    case "textDocument/prepareRename":
      // Replies to every earlier probe precede this client request on stdin.
      respond(message.id, responses);
      return;
    case "shutdown":
      respond(message.id, null);
      return;
    case "exit":
      process.exit(0);
    default:
      assert.fail("Unexpected client method");
  }
}

process.stdin.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const match = /^Content-Length: (\d+)$/i.exec(buffer.subarray(0, headerEnd).toString());
    assert(match);
    const messageEnd = headerEnd + 4 + Number(match[1]);
    if (buffer.length < messageEnd) return;
    const message: unknown = JSON.parse(buffer.subarray(headerEnd + 4, messageEnd).toString());
    buffer = buffer.subarray(messageEnd);
    assert(isMessage(message));
    handleMessage(message);
  }
});
