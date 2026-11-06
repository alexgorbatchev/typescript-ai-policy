import { describe, expect, it } from "bun:test";
import { exchangeServerMessages } from "./helpers.ts";

it.each(["true", "false", "{}", '{"nested":[]}', "[]", "[1]", "1e400", "-1e400"])(
  "rejects request identifier %s without echoing it or interrupting later requests",
  async (identifier) => {
    const responses = await exchangeServerMessages([
      `{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[]},"id":${identifier}}`,
      `{"jsonrpc":"2.0","method":"workspace/unsupported","id":${identifier}}`,
      `{"jsonrpc":"2.0","method":"$/unsupported","id":${identifier}}`,
      '{"jsonrpc":"2.0","method":"client/registerCapability","params":{"registrations":[]},"id":"after-invalid"}',
    ]);

    expect(responses).toEqual([
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
      { jsonrpc: "2.0", id: "after-invalid", result: null },
    ]);
  },
);

it.each([0, -1, 2.5, "", "server-request", "café 🎧", null])(
  "preserves valid request identifier %j and its type",
  async (identifier) => {
    const responses = await exchangeServerMessages([
      JSON.stringify({ jsonrpc: "2.0", method: "workspace/configuration", params: { items: [] }, id: identifier }),
    ]);

    expect(responses).toEqual([{ jsonrpc: "2.0", id: identifier, result: [] }]);
  },
);

describe.each(["workspace/unsupported", "$/unsupported"])("unsupported method %s", (method) => {
  it.each([0, -1, 2.5, "", "server-request", "café 🎧", null])(
    "returns Method not found with identifier %j and handles later supported requests",
    async (identifier) => {
      const responses = await exchangeServerMessages([
        JSON.stringify({ jsonrpc: "2.0", method, id: identifier }),
        '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[]},"id":"after-unsupported"}',
        '{"jsonrpc":"2.0","method":"client/registerCapability","params":{"registrations":[]},"id":"after-configuration"}',
      ]);

      expect(responses).toEqual([
        { jsonrpc: "2.0", id: identifier, error: { code: -32601, message: "Method not found" } },
        { jsonrpc: "2.0", id: "after-unsupported", result: [] },
        { jsonrpc: "2.0", id: "after-configuration", result: null },
      ]);
    },
  );
});

it("does not answer notifications or malformed responses before the next valid request", async () => {
  const responses = await exchangeServerMessages([
    '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[]}}',
    '{"jsonrpc":"2.0","method":"client/registerCapability","params":{"registrations":[]}}',
    '{"jsonrpc":"2.0","method":"workspace/unsupported"}',
    '{"jsonrpc":"2.0","method":"$/unsupported"}',
    '{"jsonrpc":"2.0","id":true,"result":[]}',
    '{"jsonrpc":"2.0","id":{},"error":{"code":-32600,"message":"Invalid Request"}}',
    '{"jsonrpc":"2.0","id":1e400,"result":[]}',
    '{"jsonrpc":"2.0","result":[]}',
    '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[]},"id":"barrier"}',
  ]);

  expect(responses).toEqual([{ jsonrpc: "2.0", id: "barrier", result: [] }]);
});
