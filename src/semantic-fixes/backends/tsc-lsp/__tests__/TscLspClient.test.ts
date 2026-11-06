import { describe, expect, it } from "bun:test";
import { exchangeServerMessages, withLanguageServer } from "./helpers.ts";

describe("workspace configuration", () => {
  it("advertises configuration requests without promising dynamic registration", async () => {
    await withLanguageServer(
      [['{"jsonrpc":"2.0","id":$requestId,"result":$initializeParams}']],
      async (client, filePath) => {
        await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toHaveProperty(
          "capabilities.workspace",
          { configuration: true, workspaceEdit: { documentChanges: false } },
        );
        await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
      },
    );
  });

  it.each([
    { items: [], result: [] },
    { items: [{}], result: [null] },
    {
      items: [
        { section: "typescript" },
        { scopeUri: "file:///workspace/file.ts", section: "javascript.preferences" },
        { scopeUri: "untitled:untitled-1" },
        { section: "" },
        { scopeUri: "", section: "café 🎧", extension: true },
        {},
      ],
      result: [null, null, null, null, null, null],
    },
  ])("returns one unavailable setting per requested item %j", async ({ items, result }) => {
    const responses = await exchangeServerMessages([
      JSON.stringify({ jsonrpc: "2.0", method: "workspace/configuration", params: { items }, id: "configuration" }),
      '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[]},"id":"after-configuration"}',
    ]);

    expect(responses).toEqual([
      { jsonrpc: "2.0", id: "configuration", result },
      { jsonrpc: "2.0", id: "after-configuration", result: [] },
    ]);
  });

  it.each([
    "null",
    "false",
    "1",
    '"text"',
    "[]",
    "{}",
    '{"items":null}',
    '{"items":{}}',
    '{"items":"settings"}',
    '{"items":[null]}',
    '{"items":[false]}',
    '{"items":[1]}',
    '{"items":["typescript"]}',
    '{"items":[[]]}',
    '{"items":[{"section":null}]}',
    '{"items":[{"section":1}]}',
    '{"items":[{"section":{}}]}',
    '{"items":[{"scopeUri":null}]}',
    '{"items":[{"scopeUri":false}]}',
    '{"items":[{"scopeUri":[]}]}',
    '{"items":[{"section":"typescript"},{"section":true}]}',
  ])("rejects malformed parameters %s without losing subsequent traffic", async (params) => {
    const responses = await exchangeServerMessages([
      `{"jsonrpc":"2.0","method":"workspace/configuration","params":${params},"id":"invalid-configuration"}`,
      '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[{}]},"id":"after-invalid"}',
    ]);

    expect(responses).toEqual([
      { jsonrpc: "2.0", id: "invalid-configuration", error: { code: -32602, message: "Invalid params" } },
      { jsonrpc: "2.0", id: "after-invalid", result: [null] },
    ]);
  });

  it("rejects missing parameters and keeps notifications silent regardless of their parameters", async () => {
    const responses = await exchangeServerMessages([
      '{"jsonrpc":"2.0","method":"workspace/configuration","id":0}',
      '{"jsonrpc":"2.0","method":"workspace/configuration"}',
      '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[{}]}}',
      '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[false]}}',
      '{"jsonrpc":"2.0","method":"workspace/configuration","params":{"items":[{}]},"id":"barrier"}',
    ]);

    expect(responses).toEqual([
      { jsonrpc: "2.0", id: 0, error: { code: -32602, message: "Invalid params" } },
      { jsonrpc: "2.0", id: "barrier", result: [null] },
    ]);
  });
});

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

it.each([
  { result: null },
  { result: false },
  { result: 0 },
  { result: "" },
  { result: "café 🎧" },
  { result: [] },
  { result: { renamed: true } },
])("preserves successful response result %j and continues without replying", async ({ result }) => {
  await withLanguageServer(
    [[`{"jsonrpc":"2.0","id":$requestId,"result":${JSON.stringify(result)}}`]],
    async (client, filePath) => {
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toEqual(result);
      await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
    },
  );
});

it("rejects a valid server error and continues without replying", async () => {
  await withLanguageServer(
    [
      [
        '{"jsonrpc":"2.0","id":$requestId,"error":{"code":-32602,"message":"Rename unavailable","data":{"reason":"symbol"}}}',
      ],
    ],
    async (client, filePath) => {
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).rejects.toEqual(
        new Error("Rename unavailable (code=-32602)"),
      );
      await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
    },
  );
});

it.each([
  '"jsonrpc":"2.0","result":null,"error":{"code":-32602,"message":"Server error"}',
  '"jsonrpc":"2.0","result":false,"error":null',
  '"jsonrpc":"2.0"',
  '"result":null',
  '"jsonrpc":"1.0","result":null',
  '"jsonrpc":2,"result":null',
  '"jsonrpc":"2.0","error":null',
  '"jsonrpc":"2.0","error":true',
  '"jsonrpc":"2.0","error":[]',
  '"jsonrpc":"2.0","error":{}',
  '"jsonrpc":"2.0","error":{"message":"Missing code"}',
  '"jsonrpc":"2.0","error":{"code":-32602}',
  '"jsonrpc":"2.0","error":{"code":"-32602","message":"String code"}',
  '"jsonrpc":"2.0","error":{"code":0.5,"message":"Fractional code"}',
  '"jsonrpc":"2.0","error":{"code":1e400,"message":"Infinite code"}',
  '"jsonrpc":"2.0","error":{"code":-1e400,"message":"Negative infinite code"}',
  '"jsonrpc":"2.0","error":{"code":-32602,"message":false}',
])("rejects the matching malformed response {%s} before a late valid duplicate", async (members) => {
  await withLanguageServer(
    [[`{"id":$requestId,${members}}`, '{"jsonrpc":"2.0","id":$requestId,"result":"late duplicate"}']],
    async (client, filePath) => {
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).rejects.toEqual(
        new Error("Invalid JSON-RPC response"),
      );
      await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
    },
  );
});

it.each(['"$requestId"', "null", "true", "{}", "[]", "-1", "0", "1.5", "1e400"])(
  "ignores uncorrelated response identifier %s without replying or settling another call",
  async (identifier) => {
    await withLanguageServer(
      [
        [
          `{"jsonrpc":"2.0","id":${identifier},"result":"uncorrelated"}`,
          `{"jsonrpc":"2.0","id":${identifier},"error":null}`,
          '{"jsonrpc":"2.0","id":$requestId,"result":"matched"}',
        ],
      ],
      async (client, filePath) => {
        await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toBe("matched");
        await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
      },
    );
  },
);

it("ignores messages without a correlatable response object", async () => {
  await withLanguageServer(
    [
      [
        "null",
        "false",
        "0",
        '"text"',
        "[]",
        "{}",
        '{"jsonrpc":"2.0","result":"missing identifier"}',
        '{"jsonrpc":"2.0","id":$requestId,"result":"matched"}',
      ],
    ],
    async (client, filePath) => {
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toBe("matched");
      await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
    },
  );
});

it("keeps server request correlation separate from an outstanding client request", async () => {
  await withLanguageServer(
    [
      [
        '{"jsonrpc":"2.0","id":$requestId,"method":"workspace/configuration","params":{"items":[]},"result":"server request"}',
        '{"jsonrpc":"2.0","id":$requestId,"result":"client response"}',
      ],
    ],
    async (client, filePath) => {
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toBe("client response");
      await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([
        { jsonrpc: "2.0", id: 1, result: [] },
      ]);
    },
  );
});

it.each(["null", "true", "0", "{}", "[]"])(
  "does not settle a pending request from a malformed method %s",
  async (method) => {
    await withLanguageServer(
      [
        [
          `{"jsonrpc":"2.0","id":$requestId,"method":${method},"result":"malformed request"}`,
          '{"jsonrpc":"2.0","id":$requestId,"result":"client response"}',
        ],
      ],
      async (client, filePath) => {
        await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toBe("client response");
        await expect(client.rename(filePath, { line: 0, character: 0 }, "updated")).resolves.toEqual([]);
      },
    );
  },
);

it("rejects only the malformed request while another request is pending", async () => {
  await withLanguageServer(
    [
      ['{"jsonrpc":"2.0","id":$requestId,"error":null}', '{"jsonrpc":"2.0","id":$requestId,"result":"late duplicate"}'],
      ['{"jsonrpc":"2.0","id":$requestId,"result":"other response"}'],
    ],
    async (client, filePath) => {
      const results = await Promise.allSettled([
        client.prepareRename(filePath, { line: 0, character: 0 }),
        client.rename(filePath, { line: 0, character: 0 }, "updated"),
      ]);
      expect(results).toEqual([
        { status: "rejected", reason: new Error("Invalid JSON-RPC response") },
        { status: "fulfilled", value: "other response" },
      ]);
      await expect(client.prepareRename(filePath, { line: 0, character: 0 })).resolves.toEqual([]);
    },
  );
});
