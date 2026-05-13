import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveCommand } from "package-manager-detector/commands";
import { detect, getUserAgent } from "package-manager-detector/detect";

type PackageMetadata = {
  name: string;
  version: string;
};

type GuidanceCommand = {
  args: string[];
  command: string;
};

type PackageUsageNoticeWriter = (text: string) => void;

const PACKAGE_USAGE_NOTICE_EMITTED = Symbol.for("@alexgorbatchev/typescript-ai-policy.package-usage-notice-emitted");
const PACKAGE_USAGE_NOTICE_WRITER = Symbol.for("@alexgorbatchev/typescript-ai-policy.package-usage-notice-writer");

function isPackageMetadata(value: unknown): value is PackageMetadata {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "name") === "string" &&
    typeof Reflect.get(value, "version") === "string"
  );
}

function readPackageJsonPath(): string {
  const packageJsonRelativePath = import.meta.url.endsWith("/packageUsageNotice.ts")
    ? "../../package.json"
    : "../package.json";

  return fileURLToPath(new URL(packageJsonRelativePath, import.meta.url));
}

function readPackageMetadata(): PackageMetadata {
  const packageJsonContent = readFileSync(readPackageJsonPath(), "utf8");
  const packageMetadata = JSON.parse(packageJsonContent);

  if (!isPackageMetadata(packageMetadata)) {
    throw new Error("Package usage notice requires package.json name and version fields.");
  }

  return packageMetadata;
}

function readFallbackGuidanceCommand(): string {
  return "npx typescript-ai-policy guidance";
}

function readGuidanceCommandText(command: GuidanceCommand): string {
  return [command.command, ...command.args].join(" ");
}

async function readDetectedGuidanceCommand(): Promise<string> {
  const detectedPackageManager = await detect();
  const packageManagerAgent = detectedPackageManager?.agent ?? getUserAgent();

  if (!packageManagerAgent) {
    return readFallbackGuidanceCommand();
  }

  const resolvedCommand = resolveCommand(packageManagerAgent, "execute-local", ["typescript-ai-policy", "guidance"]);

  return resolvedCommand ? readGuidanceCommandText(resolvedCommand) : readFallbackGuidanceCommand();
}

function writePackageUsageNoticeToStderr(text: string): void {
  process.stderr.write(text);
}

function readPackageUsageNoticeWriter(): PackageUsageNoticeWriter {
  const writer = Reflect.get(globalThis, PACKAGE_USAGE_NOTICE_WRITER);

  return typeof writer === "function" ? writer : writePackageUsageNoticeToStderr;
}

const packageMetadata = readPackageMetadata();
const packageGuidanceCommand = await readDetectedGuidanceCommand();

export function readPackageUsageNotice(): string {
  return `${packageMetadata.name}@${packageMetadata.version} is being used, see '${packageGuidanceCommand}'\n`;
}

export function printPackageUsageNoticeOnce(writer?: PackageUsageNoticeWriter): void {
  if (Reflect.get(globalThis, PACKAGE_USAGE_NOTICE_EMITTED) === true) {
    return;
  }

  (writer ?? readPackageUsageNoticeWriter())(readPackageUsageNotice());
  Reflect.set(globalThis, PACKAGE_USAGE_NOTICE_EMITTED, true);
}

export function resetPackageUsageNoticeForTests(): void {
  Reflect.deleteProperty(globalThis, PACKAGE_USAGE_NOTICE_WRITER);
  Reflect.deleteProperty(globalThis, PACKAGE_USAGE_NOTICE_EMITTED);
}

export function setPackageUsageNoticeWriterForTests(writer: PackageUsageNoticeWriter): void {
  Reflect.set(globalThis, PACKAGE_USAGE_NOTICE_WRITER, writer);
}
