import { mkdir, mkdtempDisposable } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkCoverage } from "./checkCoverage.ts";
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
  const root = process.env.POLICY_TEST_ROOT ?? resolve(".tmp");
  await mkdir(root, { recursive: true });
  await using report = await mkdtempDisposable(join(root, "coverage-"));
  const check = process.env.POLICY_CHECK_COVERAGE === "1";
  const coverageArgs = check ? ["--coverage", "--coverage-reporter=lcov", `--coverage-dir=${report.path}`] : [];
  const result = await runTestCommand([process.execPath, "test", ...process.argv.slice(2), ...coverageArgs], {
    stdio: "inherit",
    cancelSignal: controller.signal,
    env: { POLICY_CONSUMER_ROOT: consumers.path, POLICY_CHECK_COVERAGE: undefined },
  });
  process.exitCode ??= result.exitCode ?? 1;
  if (check && process.exitCode === 0) {
    console.log(await checkCoverage(await Bun.file(join(report.path, "lcov.info")).text(), resolve(".")));
  }
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
}
