import { FilenameStyle } from "./FilenameStyle.js";

export { FilenameStyle };

export const DEFAULT_FILENAME_STYLE = FilenameStyle.PascalCase;

export type FilenameStyleOptions = {
  filenameStyle?: FilenameStyle;
};

export function readFilenameStyleLabel(filenameStyle: FilenameStyle): string {
  switch (filenameStyle) {
    case FilenameStyle.PascalCase:
      return "[use]PascalCase";
    case FilenameStyle.DashCase:
      return "dash-case";
  }
}

export function readFilenameStyleLabels(): string[] {
  return [FilenameStyle.PascalCase, FilenameStyle.DashCase].map((filenameStyle) =>
    readFilenameStyleLabel(filenameStyle),
  );
}

export const filenameStyleRuleSchema = [
  {
    type: "object",
    properties: {
      filenameStyle: {
        type: "string",
        enum: readFilenameStyleLabels(),
      },
    },
    additionalProperties: false,
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFilenameStyle(value: unknown): value is FilenameStyle {
  return value === FilenameStyle.PascalCase || value === FilenameStyle.DashCase;
}

export function readFilenameStyleFromLabel(value: unknown): FilenameStyle | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value) {
    case "[use]PascalCase":
      return FilenameStyle.PascalCase;
    case "dash-case":
      return FilenameStyle.DashCase;
    default:
      return null;
  }
}

export function readFilenameStyle(options: readonly unknown[]): FilenameStyle {
  const firstOption = options[0];
  if (!isRecord(firstOption)) {
    return DEFAULT_FILENAME_STYLE;
  }

  return readFilenameStyleFromLabel(firstOption.filenameStyle) ?? DEFAULT_FILENAME_STYLE;
}

export function readComponentFilePattern(filenameStyle: FilenameStyle): string {
  return filenameStyle === FilenameStyle.DashCase ? "component-name.tsx" : "ComponentName.tsx";
}

export function readHookExportPattern(): string {
  return "[use]PascalCase";
}

export function readHookFilePattern(filenameStyle: FilenameStyle): string {
  return filenameStyle === FilenameStyle.DashCase ? "use-thing.ts{,x}" : "useThing.ts{,x}";
}

export function readHookOwnershipFileGlobs(filenameStyle: FilenameStyle): string[] {
  return filenameStyle === FilenameStyle.DashCase
    ? ["**/use-*.ts", "**/use-*.tsx"]
    : ["**/use[A-Z]*.ts", "**/use[A-Z]*.tsx"];
}

export function readExpectedComponentNameFromFileStem(fileStem: string, filenameStyle: FilenameStyle): string | null {
  if (filenameStyle === FilenameStyle.PascalCase) {
    return /^[A-Z][A-Za-z0-9]*$/u.test(fileStem) ? fileStem : null;
  }

  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(fileStem)
    ? fileStem
        .split("-")
        .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
        .join("")
    : null;
}

export function readExpectedHookNameFromFileStem(fileStem: string, filenameStyle: FilenameStyle): string | null {
  if (filenameStyle === FilenameStyle.PascalCase) {
    return /^use[A-Z][A-Za-z0-9]*$/u.test(fileStem) ? fileStem : null;
  }

  if (!/^use(?:-[a-z0-9]+)+$/u.test(fileStem)) {
    return null;
  }

  const [, ...segments] = fileStem.split("-");

  return `use${segments.map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`).join("")}`;
}

export function isHookOwnershipFileStem(fileStem: string, filenameStyle: FilenameStyle): boolean {
  return readExpectedHookNameFromFileStem(fileStem, filenameStyle) !== null;
}
