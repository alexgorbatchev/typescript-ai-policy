import { expect, it } from "bun:test";
import { runCheck } from "../runCheck.ts";

it("runs formatter then linter checks by default", async () => {
  const commands: Array<readonly string[]> = [];

  await runCheck({
    env: {},
    async runCommand(command) {
      commands.push(command);
    },
  });

  expect(commands).toEqual([
    ["bun", "--bun", "oxfmt", "--check", "."],
    ["bun", "--bun", "oxlint", "."],
  ]);
});

it("runs oxlint with unix format when AGENT=1", async () => {
  const commands: Array<readonly string[]> = [];

  await runCheck({
    env: {
      AGENT: "1",
    },
    async runCommand(command) {
      commands.push(command);
    },
  });

  expect(commands).toEqual([
    ["bun", "--bun", "oxfmt", "--check", "."],
    ["bun", "--bun", "oxlint", "--format", "unix", "."],
  ]);
});

it("stops after the formatter when the formatter fails", async () => {
  const commands: Array<readonly string[]> = [];

  await expect(
    runCheck({
      env: {},
      async runCommand(command) {
        commands.push(command);

        return Promise.reject(new Error("formatter failed"));
      },
    }),
  ).rejects.toThrow("formatter failed");

  expect(commands).toEqual([["bun", "--bun", "oxfmt", "--check", "."]]);
});
