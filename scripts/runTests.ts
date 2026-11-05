import { mkdtempDisposable } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTestCommand } from "./runTestCommand.ts";

const consumerParent = process.env.POLICY_CONSUMER_ROOT ?? tmpdir();
const controller = new AbortController();
const interrupt = () => {
  process.exitCode = 130;
  controller.abort();
};
const terminate = () => {
  process.exitCode = 143;
  controller.abort();
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
try {
  await using consumers = await mkdtempDisposable(join(consumerParent, "policy-consumers-"));
  const result = await runTestCommand([process.execPath, "test", ...process.argv.slice(2)], {
    stdio: "inherit",
    cancelSignal: controller.signal,
    env: { POLICY_CONSUMER_ROOT: consumers.path },
  });
  process.exitCode ??= result.exitCode ?? 1;
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
}
