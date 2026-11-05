import { join, relative, resolve, sep } from "node:path";
import {
  COMPONENT_OWNERSHIP_DIRECTORY_NAMES,
  isExemptSupportBasename,
  readNearestPackageRootPath,
} from "../helpers.ts";

type ComponentOwnershipRole = {
  packagePath: string;
  areaPath: string;
  rolePath: string[];
};

export function readComponentOwnershipRole(filename: string): ComponentOwnershipRole | null {
  const packagePath = readNearestPackageRootPath(filename);
  if (!packagePath) return null;

  const segments = relative(packagePath, resolve(filename)).split(sep);
  const areaIndex = segments.findIndex((segment) =>
    COMPONENT_OWNERSHIP_DIRECTORY_NAMES.some((name) => name === segment),
  );
  if (areaIndex < 0 || areaIndex === segments.length - 1) return null;
  return {
    packagePath,
    areaPath: join(packagePath, ...segments.slice(0, areaIndex + 1)),
    rolePath: segments.slice(areaIndex + 1),
  };
}

export function isRuntimeComponentOwnershipFile(filename: string): boolean {
  const role = readComponentOwnershipRole(filename);
  return (
    role !== null &&
    filename.endsWith(".tsx") &&
    !isExemptSupportBasename(filename) &&
    !/\.(?:stories|test|spec)\.tsx$/u.test(filename) &&
    !role.rolePath
      .slice(0, -1)
      .some((segment) =>
        ["stories", "__tests__", "hooks", "fixtures", "__fixtures__", "node_modules"].includes(segment),
      )
  );
}
